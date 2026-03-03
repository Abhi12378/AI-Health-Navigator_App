import { execSync } from 'node:child_process';
import path from 'node:path';
import process from 'node:process';
import dotenv from 'dotenv';
import { STSClient, GetCallerIdentityCommand } from '@aws-sdk/client-sts';
import {
  ECRClient,
  CreateRepositoryCommand,
  DescribeRepositoriesCommand,
  GetAuthorizationTokenCommand,
} from '@aws-sdk/client-ecr';
import {
  IAMClient,
  AttachRolePolicyCommand,
  CreateRoleCommand,
  GetRoleCommand,
} from '@aws-sdk/client-iam';
import {
  AppRunnerClient,
  CreateServiceCommand,
  DescribeServiceCommand,
  ListServicesCommand,
  UpdateServiceCommand,
} from '@aws-sdk/client-apprunner';
import AppRunnerSdk from '@aws-sdk/client-apprunner';

const { DescribeOperationCommand } = AppRunnerSdk;

dotenv.config({ path: '.env.local' });
dotenv.config();

const region = process.env.AWS_REGION || 'us-east-1';
const appName = process.env.APP_RUNNER_SERVICE_NAME || 'ai-health-navigator';
const repositoryName = process.env.ECR_REPOSITORY_NAME || appName;
const imageTag = process.env.IMAGE_TAG || 'latest';
const roleName = process.env.APP_RUNNER_ECR_ROLE_NAME || `${appName}-apprunner-ecr-access`;

const sts = new STSClient({ region });
const ecr = new ECRClient({ region });
const iam = new IAMClient({ region });
const apprunner = new AppRunnerClient({ region });

const runtimeEnvironmentVariables = buildRuntimeEnvironmentVariables();

function buildRuntimeEnvironmentVariables() {
  const keys = [
    'NODE_ENV',
    'PORT',
    'SESSION_SECRET',
    'GOOGLE_CLIENT_ID',
    'GOOGLE_CLIENT_SECRET',
    'GOOGLE_CALLBACK_URL',
    'APP_BASE_URL',
    'GOOGLE_MAPS_API_KEY',
    'GEMINI_API_KEY',
    'GEMINI_MODEL_ID',
    'BEDROCK_MODEL_ID',
    'ALLOW_GEMINI_FALLBACK',
    'BEDROCK_RECHECK_INTERVAL_MS',
    'AWS_REGION',
    'AWS_ACCESS_KEY_ID',
    'AWS_SECRET_ACCESS_KEY',
    'AWS_SESSION_TOKEN',
    'AWS_PROFILE',
    'AWS_S3_BUCKET_NAME',
  ];

  const entries = keys
    .map((key) => [key, process.env[key]])
    .filter(([, value]) => typeof value === 'string' && value.length > 0);

  const envMap = Object.fromEntries(entries);

  if (!envMap.NODE_ENV) envMap.NODE_ENV = 'production';
  if (!envMap.PORT) envMap.PORT = '3000';
  if (!envMap.AWS_REGION) envMap.AWS_REGION = region;

  return envMap;
}

function run(command) {
  execSync(command, { stdio: 'inherit' });
}

async function ensureEcrRepository() {
  try {
    await ecr.send(new DescribeRepositoriesCommand({ repositoryNames: [repositoryName] }));
    console.log(`ECR repository exists: ${repositoryName}`);
  } catch (error) {
    if (error?.name !== 'RepositoryNotFoundException') {
      throw error;
    }

    await ecr.send(
      new CreateRepositoryCommand({
        repositoryName,
        imageScanningConfiguration: { scanOnPush: true },
      })
    );
    console.log(`Created ECR repository: ${repositoryName}`);
  }
}

async function getAccountId() {
  const identity = await sts.send(new GetCallerIdentityCommand({}));
  if (!identity.Account) {
    throw new Error('Unable to resolve AWS account ID from current credentials.');
  }
  return identity.Account;
}

async function dockerLogin(registryUri) {
  const auth = await ecr.send(new GetAuthorizationTokenCommand({}));
  const data = auth.authorizationData?.[0];

  if (!data?.authorizationToken || !data?.proxyEndpoint) {
    throw new Error('Unable to retrieve ECR authorization token.');
  }

  const decoded = Buffer.from(data.authorizationToken, 'base64').toString('utf8');
  const password = decoded.split(':')[1];

  run(`docker login --username AWS --password ${JSON.stringify(password)} ${registryUri}`);
}

async function ensureEcrAccessRole() {
  try {
    const existing = await iam.send(new GetRoleCommand({ RoleName: roleName }));
    return existing.Role?.Arn;
  } catch (error) {
    if (error?.name !== 'NoSuchEntityException') {
      throw error;
    }
  }

  const trustPolicy = {
    Version: '2012-10-17',
    Statement: [
      {
        Effect: 'Allow',
        Principal: { Service: 'build.apprunner.amazonaws.com' },
        Action: 'sts:AssumeRole',
      },
    ],
  };

  const created = await iam.send(
    new CreateRoleCommand({
      RoleName: roleName,
      AssumeRolePolicyDocument: JSON.stringify(trustPolicy),
      Description: 'Allows AWS App Runner build service to pull images from private ECR.',
    })
  );

  await iam.send(
    new AttachRolePolicyCommand({
      RoleName: roleName,
      PolicyArn: 'arn:aws:iam::aws:policy/service-role/AWSAppRunnerServicePolicyForECRAccess',
    })
  );

  if (!created.Role?.Arn) {
    throw new Error('Failed to create App Runner ECR access role.');
  }

  console.log(`Created IAM role: ${roleName}`);
  return created.Role.Arn;
}

async function findServiceByName(name) {
  const listed = await apprunner.send(new ListServicesCommand({}));
  return listed.ServiceSummaryList?.find((service) => service.ServiceName === name);
}

async function waitForOperation(operationId) {
  process.stdout.write(`Waiting for App Runner operation: ${operationId}`);
  while (true) {
    const result = await apprunner.send(new DescribeOperationCommand({ OperationArn: operationId }));
    const status = result.Operation?.Status;

    if (status === 'SUCCEEDED') {
      process.stdout.write(' done\n');
      return;
    }

    if (status === 'FAILED' || status === 'ROLLBACK_FAILED' || status === 'ROLLBACK_SUCCEEDED') {
      process.stdout.write(' failed\n');
      throw new Error(`App Runner operation did not succeed. Current status: ${status}`);
    }

    process.stdout.write('.');
    await new Promise((resolve) => setTimeout(resolve, 10000));
  }
}

async function waitForServiceRunning(serviceArn) {
  process.stdout.write('Waiting for service status RUNNING');
  while (true) {
    const described = await apprunner.send(new DescribeServiceCommand({ ServiceArn: serviceArn }));
    const status = described.Service?.Status;

    if (status === 'RUNNING') {
      process.stdout.write(' done\n');
      const url = described.Service?.ServiceUrl;
      if (!url) throw new Error('Service is running but no URL was returned by App Runner.');
      return url;
    }

    if (status === 'DELETED' || status === 'DELETE_FAILED' || status === 'CREATE_FAILED') {
      process.stdout.write(' failed\n');
      throw new Error(`Service entered a terminal status: ${status}`);
    }

    process.stdout.write('.');
    await new Promise((resolve) => setTimeout(resolve, 10000));
  }
}

async function createOrUpdateService({ serviceArn, imageIdentifier, accessRoleArn }) {
  const sourceConfiguration = {
    AutoDeploymentsEnabled: true,
    AuthenticationConfiguration: {
      AccessRoleArn: accessRoleArn,
    },
    ImageRepository: {
      ImageRepositoryType: 'ECR',
      ImageIdentifier: imageIdentifier,
      ImageConfiguration: {
        Port: '3000',
        RuntimeEnvironmentVariables: runtimeEnvironmentVariables,
      },
    },
  };

  if (!serviceArn) {
    const created = await apprunner.send(
      new CreateServiceCommand({
        ServiceName: appName,
        SourceConfiguration: sourceConfiguration,
      })
    );

    return {
      serviceArn: created.Service?.ServiceArn,
      operationArn: created.OperationId,
    };
  }

  const updated = await apprunner.send(
    new UpdateServiceCommand({
      ServiceArn: serviceArn,
      SourceConfiguration: sourceConfiguration,
    })
  );

  return {
    serviceArn,
    operationArn: updated.OperationId,
  };
}

async function main() {
  console.log(`Region: ${region}`);
  console.log(`Service: ${appName}`);

  const accountId = await getAccountId();
  const registryUri = `${accountId}.dkr.ecr.${region}.amazonaws.com`;
  const imageIdentifier = `${registryUri}/${repositoryName}:${imageTag}`;

  await ensureEcrRepository();
  await dockerLogin(registryUri);

  console.log('Building Docker image...');
  run(`docker build -t ${imageIdentifier} ${JSON.stringify(path.resolve('.'))}`);

  console.log('Pushing Docker image to ECR...');
  run(`docker push ${imageIdentifier}`);

  const accessRoleArn = await ensureEcrAccessRole();
  const existing = await findServiceByName(appName);
  const currentArn = existing?.ServiceArn;

  const { serviceArn, operationArn } = await createOrUpdateService({
    serviceArn: currentArn,
    imageIdentifier,
    accessRoleArn,
  });

  if (!serviceArn || !operationArn) {
    throw new Error('App Runner create/update did not return required identifiers.');
  }

  await waitForOperation(operationArn);
  const serviceUrl = await waitForServiceRunning(serviceArn);

  const fullUrl = serviceUrl.startsWith('http') ? serviceUrl : `https://${serviceUrl}`;
  console.log(`\n✅ Prototype URL: ${fullUrl}`);
}

main().catch((error) => {
  console.error('\n❌ Deploy failed:', error);
  process.exit(1);
});