import React, { useState, useEffect } from 'react';
import { 
  Search, MapPin, Navigation, Phone, Star, Filter, 
  Building2, Clock, AlertCircle, X, Loader2, RefreshCw
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

// 1. Hospital Data Interface
interface Hospital {
  id: string;
  name: string;
  type: 'Government' | 'Private' | 'Clinic' | 'Emergency Center' | 'Hospital';
  latitude: number;
  longitude: number;
  address: string;
  phone: string;
  rating: number;
  isOpen: boolean; // Added for filtering
  isEmergency: boolean; // Added for filtering
}

// 3. Haversine Distance Calculation
function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371; // Radius of the earth in km
  const dLat = deg2rad(lat2 - lat1);
  const dLon = deg2rad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(deg2rad(lat1)) * Math.cos(deg2rad(lat2)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const d = R * c; // Distance in km
  return d;
}

function deg2rad(deg: number) {
  return deg * (Math.PI / 180);
}

interface HospitalWithDistance extends Hospital {
  distance: number;
}

interface HospitalLocatorProps {
  isOpen: boolean;
  onClose: () => void;
}

const HospitalLocator: React.FC<HospitalLocatorProps> = ({ isOpen, onClose }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [filterGovernment, setFilterGovernment] = useState(false);
  const [filterOpenNow, setFilterOpenNow] = useState(false);
  const [filterEmergency, setFilterEmergency] = useState(false);
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [hospitals, setHospitals] = useState<HospitalWithDistance[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [permissionDenied, setPermissionDenied] = useState(false);

  const getLocationAndFetchHospitals = () => {
    setLoading(true);
    setError(null);
    setPermissionDenied(false);

    if (!navigator.geolocation) {
      setError("Geolocation is not supported by your browser");
      setLoading(false);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude } = position.coords;
        setUserLocation({ lat: latitude, lng: longitude });

        try {
          const response = await fetch(`/api/hospitals/nearby?lat=${latitude}&lng=${longitude}&radiusKm=30`);
          if (!response.ok) {
            throw new Error(`Failed to fetch nearby hospitals: ${response.status}`);
          }

          const data = await response.json();
          const placesHospitals: Hospital[] = data.hospitals || [];

          const nearbyHospitals = placesHospitals
            .map((hospital) => {
              const distance = calculateDistance(latitude, longitude, hospital.latitude, hospital.longitude);
              return { ...hospital, distance };
            })
            .filter((hospital) => hospital.distance <= 30)
            .sort((a, b) => a.distance - b.distance);

          setHospitals(nearbyHospitals);
        } catch (fetchError) {
          console.error('Hospital lookup error:', fetchError);
          setHospitals([]);
          setError('Unable to load real-time nearby hospitals right now. Please try again.');
        } finally {
          setLoading(false);
        }
      },
      (err) => {
        console.error("Error getting location:", err);
        if (err.code === err.PERMISSION_DENIED) {
          setPermissionDenied(true);
          setError("Location access required to find nearby hospitals.");
        } else {
          setError("Unable to retrieve your location. Please try again.");
        }
        setLoading(false);
      }
    );
  };

  useEffect(() => {
    if (isOpen) {
      getLocationAndFetchHospitals();
    }
  }, [isOpen]);

  const filteredHospitals = hospitals.filter(hospital => {
    const matchesSearch = hospital.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          hospital.address.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesGov = filterGovernment ? (hospital.type === 'Government' || hospital.name.toLowerCase().includes('government')) : true;
    const matchesOpen = filterOpenNow ? hospital.isOpen : true;
    const matchesEmergency = filterEmergency ? (hospital.isEmergency || hospital.type === 'Emergency Center') : true;

    return matchesSearch && matchesGov && matchesOpen && matchesEmergency;
  });

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-60 backdrop-blur-sm p-0 md:p-4">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 20 }}
          className="bg-gray-50 w-full max-w-4xl h-full md:h-[90vh] md:rounded-2xl shadow-2xl overflow-hidden flex flex-col"
        >
          {/* Header */}
          <div className="bg-white border-b px-4 py-3 flex items-center justify-between shadow-sm z-10">
            <div className="flex items-center gap-3">
              <div className="bg-emerald-100 p-2 rounded-lg text-emerald-600">
                <Building2 className="w-6 h-6" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-gray-900">Hospital Locator</h2>
                <p className="text-xs text-gray-500">
                  {loading ? 'Locating...' : `Found ${filteredHospitals.length} hospitals within 30km`}
                </p>
              </div>
            </div>
            <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full transition-colors">
              <X className="w-6 h-6 text-gray-500" />
            </button>
          </div>

          {/* Main Content */}
          <div className="flex-1 flex flex-col overflow-hidden bg-white">
            
            {/* Search & Filters */}
            {!permissionDenied && !loading && (
              <div className="p-4 space-y-3 border-b border-gray-100 bg-white">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                  <input 
                    type="text" 
                    placeholder="Search hospitals, clinics..." 
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-10 pr-4 py-2.5 bg-gray-100 border-transparent focus:bg-white focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200 rounded-xl outline-none transition-all text-sm"
                  />
                </div>
                
                <div className="flex gap-2 overflow-x-auto pb-1 no-scrollbar">
                  <button 
                    onClick={() => setFilterGovernment(!filterGovernment)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap border transition-colors flex items-center gap-1.5 ${
                      filterGovernment 
                        ? 'bg-emerald-50 border-emerald-200 text-emerald-700' 
                        : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'
                    }`}
                  >
                    <Building2 className="w-3.5 h-3.5" />
                    Govt Only
                  </button>
                  <button 
                    onClick={() => setFilterOpenNow(!filterOpenNow)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap border transition-colors flex items-center gap-1.5 ${
                      filterOpenNow 
                        ? 'bg-blue-50 border-blue-200 text-blue-700' 
                        : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'
                    }`}
                  >
                    <Clock className="w-3.5 h-3.5" />
                    Open Now
                  </button>
                  <button 
                    onClick={() => setFilterEmergency(!filterEmergency)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap border transition-colors flex items-center gap-1.5 ${
                      filterEmergency 
                        ? 'bg-red-50 border-red-200 text-red-700' 
                        : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'
                    }`}
                  >
                    <AlertCircle className="w-3.5 h-3.5" />
                    Emergency
                  </button>
                </div>
              </div>
            )}

            {/* Content Area */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50">
              {loading ? (
                <div className="flex flex-col items-center justify-center h-64 text-gray-500">
                  <Loader2 className="w-8 h-8 animate-spin mb-2 text-emerald-600" />
                  <p>Finding hospitals near you...</p>
                </div>
              ) : permissionDenied ? (
                <div className="flex flex-col items-center justify-center h-64 text-center px-4">
                  <div className="bg-red-100 p-4 rounded-full mb-4">
                    <MapPin className="w-8 h-8 text-red-600" />
                  </div>
                  <h3 className="text-lg font-bold text-gray-900 mb-2">Location Access Required</h3>
                  <p className="text-gray-500 mb-6 max-w-xs">
                    Please enable location access to find hospitals nearby. We use your location only to calculate distances.
                  </p>
                  <button 
                    onClick={getLocationAndFetchHospitals}
                    className="flex items-center gap-2 px-6 py-2.5 bg-emerald-600 text-white rounded-xl font-medium hover:bg-emerald-700 transition-colors"
                  >
                    <RefreshCw className="w-4 h-4" />
                    Retry Access
                  </button>
                </div>
              ) : filteredHospitals.length === 0 ? (
                <div className="text-center py-10 text-gray-500">
                  <MapPin className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                  <p>No hospitals found within 30km of your location.</p>
                  <p className="text-xs text-gray-400 mt-1">Try adjusting your filters or search.</p>
                  {error && <p className="text-xs text-red-500 mt-2">{error}</p>}
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {filteredHospitals.map(hospital => (
                    <div key={hospital.id} className="bg-white p-4 rounded-xl shadow-sm border border-gray-200 hover:shadow-md transition-shadow flex flex-col h-full">
                      <div className="flex justify-between items-start mb-2">
                        <div>
                          <h3 className="font-bold text-gray-900">{hospital.name}</h3>
                          <div className="flex items-center gap-2 mt-1">
                            <span className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded ${
                              hospital.type === 'Government' ? 'bg-blue-100 text-blue-700' :
                              hospital.type === 'Emergency Center' ? 'bg-red-100 text-red-700' :
                              'bg-gray-100 text-gray-700'
                            }`}>
                              {hospital.type}
                            </span>
                            <span className="text-xs font-semibold text-emerald-600 flex items-center gap-1">
                              <MapPin className="w-3 h-3" />
                              {hospital.distance.toFixed(1)} km
                            </span>
                          </div>
                        </div>
                        <div className="flex items-center gap-1 bg-yellow-50 px-2 py-1 rounded text-xs font-bold text-yellow-700">
                          <Star className="w-3 h-3 fill-current" />
                          {hospital.rating}
                        </div>
                      </div>
                      
                      <p className="text-sm text-gray-600 mb-3 line-clamp-2 flex-1">{hospital.address}</p>
                      
                      <div className="flex items-center gap-2 mb-4">
                        {hospital.isOpen ? (
                          <span className="text-xs font-medium text-green-600 bg-green-50 px-2 py-0.5 rounded">Open Now</span>
                        ) : (
                          <span className="text-xs font-medium text-red-600 bg-red-50 px-2 py-0.5 rounded">Closed</span>
                        )}
                        {hospital.isEmergency && (
                          <span className="text-xs font-medium text-red-600 bg-red-50 px-2 py-0.5 rounded flex items-center gap-1">
                            <AlertCircle className="w-3 h-3" /> Emergency
                          </span>
                        )}
                      </div>

                      <div className="flex gap-2 mt-auto">
                        <button 
                          onClick={() => window.open(`https://www.google.com/maps/dir/?api=1&destination=${hospital.latitude},${hospital.longitude}`, '_blank')}
                          className="flex-1 bg-emerald-600 text-white py-2 rounded-lg text-sm font-medium hover:bg-emerald-700 transition-colors flex items-center justify-center gap-2"
                        >
                          <Navigation className="w-4 h-4" />
                          Navigate
                        </button>
                        <a href={`tel:${hospital.phone}`} className="flex-1 border border-gray-200 text-gray-700 py-2 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors flex items-center justify-center gap-2">
                          <Phone className="w-4 h-4" />
                          Call
                        </a>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};

export default HospitalLocator;
