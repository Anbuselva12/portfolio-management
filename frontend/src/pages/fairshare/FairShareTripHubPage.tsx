import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Palmtree,
  Plus,
  MapPin,
  Calendar,
  Users,
  Home,
  ArrowRight,
  Trash2,
  CheckCircle2,
  Clock,
  Sparkles,
  X,
  CreditCard,
} from 'lucide-react';
import { fairShareApi } from '../../api/endpoints/fairshare.api';
import { FairShareTrip } from '../../types';

export const FairShareTripHubPage: React.FC = () => {
  const navigate = useNavigate();
  const [trips, setTrips] = useState<FairShareTrip[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Form State
  const [title, setTitle] = useState('');
  const [location, setLocation] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [durationDays, setDurationDays] = useState(2);
  const [currency, setCurrency] = useState('INR');
  const [defaultSplitMode, setDefaultSplitMode] = useState<'equal_headcount' | 'equal_family' | 'custom_percentage'>('equal_headcount');
  const [households, setHouseholds] = useState<{ name: string }[]>([
    { name: '' },
    { name: '' },
  ]);
  const [participants, setParticipants] = useState<
    { name: string; householdIndex: number }[]
  >([]);

  const fetchTrips = async () => {
    try {
      setLoading(true);
      const res = await fairShareApi.getTrips();
      setTrips(res);
    } catch (err) {
      console.error('Failed to load trips:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTrips();
  }, []);

  const handleAddHousehold = () => {
    setHouseholds([...households, { name: '' }]);
  };

  const handleRemoveHousehold = (index: number) => {
    setHouseholds(households.filter((_, i) => i !== index));
    setParticipants(participants.filter((p) => p.householdIndex !== index));
  };

  const handleAddParticipant = () => {
    setParticipants([...participants, { name: '', householdIndex: 0 }]);
  };

  const handleRemoveParticipant = (index: number) => {
    setParticipants(participants.filter((_, i) => i !== index));
  };

  const handleCreateTrip = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    try {
      setSubmitting(true);
      const validHouseholds = households.filter((h) => h.name.trim() !== '');
      const validParticipants = participants.filter((p) => p.name.trim() !== '');

      const newTrip = await fairShareApi.createTrip({
        title: title.trim(),
        location: location.trim() || undefined,
        start_date: startDate || undefined,
        end_date: endDate || undefined,
        duration_days: Number(durationDays) || 1,
        currency,
        default_split_mode: defaultSplitMode,
        settlement_level: 'family',
        households: validHouseholds.map((h, i) => ({ name: h.name.trim(), sort_order: i })),
        participants: validParticipants.map((p) => ({
          name: p.name.trim(),
          household_index: p.householdIndex,
          is_guest: true,
        })),
      });

      setIsModalOpen(false);
      resetForm();
      navigate(`/fairshare/trips/${newTrip.id}`);
    } catch (err) {
      console.error('Failed to create trip:', err);
    } finally {
      setSubmitting(false);
    }
  };

  const resetForm = () => {
    setTitle('');
    setLocation('');
    setStartDate('');
    setEndDate('');
    setDurationDays(2);
    setCurrency('INR');
    setDefaultSplitMode('equal_headcount');
    setHouseholds([{ name: '' }, { name: '' }]);
    setParticipants([]);
  };

  const handleDeleteTrip = async (e: React.MouseEvent, tripId: string) => {
    e.stopPropagation();
    if (!window.confirm('Are you sure you want to delete this trip and all its expense data?')) return;
    try {
      await fairShareApi.deleteTrip(tripId);
      setTrips(trips.filter((t) => t.id !== tripId));
    } catch (err) {
      console.error('Failed to delete trip:', err);
    }
  };

  const formatMoney = (amount: number | string, curr: string = 'INR') => {
    const sym = curr === 'INR' ? '₹' : curr;
    const num = Number(amount) || 0;
    return `${sym}${num.toLocaleString('en-IN', { maximumFractionDigits: 0 })}`;
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white dark:bg-gray-800 p-6 rounded-2xl border border-gray-150 dark:border-gray-700 shadow-xs">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-2 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
              <Palmtree className="w-5 h-5" />
            </span>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">FairShare Trips & Events</h1>
          </div>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Split group vacations, household costs, and social events with automated minimal-settlement calculations.
          </p>
        </div>

        <button
          onClick={() => setIsModalOpen(true)}
          className="flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-sm transition-all shadow-xs cursor-pointer shrink-0"
        >
          <Plus className="w-4 h-4" />
          <span>New Trip / Event</span>
        </button>
      </div>

      {/* Trips Grid */}
      {loading ? (
        <div className="flex items-center justify-center py-20 text-gray-400">
          <Clock className="w-6 h-6 animate-spin mr-2" />
          <span>Loading trips...</span>
        </div>
      ) : trips.length === 0 ? (
        <div className="bg-white dark:bg-gray-800 rounded-2xl border border-dashed border-gray-300 dark:border-gray-700 p-12 text-center">
          <div className="w-16 h-16 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 flex items-center justify-center mx-auto mb-4">
            <Palmtree className="w-8 h-8" />
          </div>
          <h3 className="text-lg font-bold text-gray-900 dark:text-white">No Trips or Events Yet</h3>
          <p className="text-sm text-gray-500 dark:text-gray-400 max-w-md mx-auto mt-1 mb-6">
            Create your first group trip to track shared travel, lodging, meals, and family expenses with instant settlement rollups.
          </p>
          <button
            onClick={() => setIsModalOpen(true)}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold transition-colors cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Create First Trip</span>
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {trips.map((trip) => {
            const totalSpend = (trip.expenses || []).reduce(
              (acc, e) => acc + (Number(e.amount) || 0),
              0,
            );
            return (
              <div
                key={trip.id}
                onClick={() => navigate(`/fairshare/trips/${trip.id}`)}
                className="group bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-5 hover:border-emerald-500 dark:hover:border-emerald-500 hover:shadow-md transition-all cursor-pointer flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <h3 className="text-lg font-bold text-gray-900 dark:text-white truncate group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors">
                          {trip.title}
                        </h3>
                        {trip.is_settled ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                            <CheckCircle2 className="w-3 h-3" /> Settled
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300">
                            <Clock className="w-3 h-3" /> Active
                          </span>
                        )}
                      </div>
                      {trip.location && (
                        <div className="flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400 mt-1">
                          <MapPin className="w-3.5 h-3.5 text-gray-400" />
                          <span className="truncate">{trip.location}</span>
                        </div>
                      )}
                    </div>

                    <button
                      type="button"
                      onClick={(e) => handleDeleteTrip(e, trip.id)}
                      className="text-gray-400 hover:text-red-500 p-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors cursor-pointer"
                      title="Delete trip"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>

                  {/* Trip Details */}
                  <div className="flex items-center gap-4 text-xs text-gray-500 dark:text-gray-400 py-3 border-y border-gray-100 dark:border-gray-700/60 my-3">
                    <div className="flex items-center gap-1">
                      <Calendar className="w-3.5 h-3.5 text-gray-400" />
                      <span>{trip.duration_days} Days</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Home className="w-3.5 h-3.5 text-gray-400" />
                      <span>{trip.households?.length || 0} Families</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Users className="w-3.5 h-3.5 text-gray-400" />
                      <span>{trip.participants?.length || 0} Members</span>
                    </div>
                  </div>
                </div>

                {/* Footer KPIs */}
                <div className="pt-2 flex items-center justify-between">
                  <div>
                    <span className="text-[11px] font-medium text-gray-400 uppercase tracking-wider block">
                      Total Spend
                    </span>
                    <span className="text-lg font-extrabold text-gray-900 dark:text-white">
                      {formatMoney(totalSpend, trip.currency)}
                    </span>
                  </div>

                  <div className="flex items-center gap-1 text-xs font-semibold text-emerald-600 dark:text-emerald-400 group-hover:translate-x-1 transition-transform">
                    <span>Manage</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* New Trip Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs overflow-y-auto">
          <div className="bg-white dark:bg-gray-800 rounded-3xl max-w-2xl w-full border border-gray-200 dark:border-gray-700 shadow-2xl p-6 sm:p-8 my-8">
            <div className="flex items-center justify-between pb-4 border-b border-gray-100 dark:border-gray-700">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-emerald-500/10 text-emerald-600 flex items-center justify-center">
                  <Palmtree className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-gray-900 dark:text-white">Create New Trip / Event</h3>
                  <p className="text-xs text-gray-500 dark:text-gray-400">Configure trip details, households and participants</p>
                </div>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateTrip} className="space-y-5 mt-5">
              {/* Basic Details */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="sm:col-span-2">
                  <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                    Trip or Event Title *
                  </label>
                  <input
                    type="text"
                    required
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="Enter trip title (e.g., Weekend Getaway, Office Trip)"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-sm focus:ring-2 focus:ring-emerald-500 outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                    Destination / Location
                  </label>
                  <input
                    type="text"
                    value={location}
                    onChange={(e) => setLocation(e.target.value)}
                    placeholder="Enter location (e.g., Hill Station, Beach Resort)"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-sm focus:ring-2 focus:ring-emerald-500 outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                    Duration (Days)
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={durationDays}
                    onChange={(e) => setDurationDays(Number(e.target.value))}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-sm focus:ring-2 focus:ring-emerald-500 outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                    Start Date
                  </label>
                  <input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-sm focus:ring-2 focus:ring-emerald-500 outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                    End Date
                  </label>
                  <input
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-sm focus:ring-2 focus:ring-emerald-500 outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                    Default Split Mode
                  </label>
                  <select
                    value={defaultSplitMode}
                    onChange={(e) => setDefaultSplitMode(e.target.value as any)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-sm focus:ring-2 focus:ring-emerald-500 outline-none"
                  >
                    <option value="equal_headcount">Equally by Headcount (Individual)</option>
                    <option value="equal_family">Equally by Family / Household Unit</option>
                    <option value="custom_percentage">Custom Percentage (Sum to 100%)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                    Currency
                  </label>
                  <select
                    value={currency}
                    onChange={(e) => setCurrency(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-sm focus:ring-2 focus:ring-emerald-500 outline-none"
                  >
                    <option value="INR">INR (₹)</option>
                    <option value="USD">USD ($)</option>
                    <option value="EUR">EUR (€)</option>
                    <option value="GBP">GBP (£)</option>
                  </select>
                </div>
              </div>

              {/* Household Groups */}
              <div className="pt-3 border-t border-gray-100 dark:border-gray-700">
                <div className="flex items-center justify-between mb-2">
                  <div>
                    <label className="text-xs font-bold text-gray-800 dark:text-gray-200 flex items-center gap-1.5">
                      <Home className="w-3.5 h-3.5 text-emerald-600" />
                      <span>Family / Household Groups</span>
                    </label>
                    <span className="text-[11px] text-gray-400">
                      Group participants by household unit for family-level rollups
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={handleAddHousehold}
                    className="text-xs font-semibold text-emerald-600 hover:text-emerald-700 flex items-center gap-1"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Add Family</span>
                  </button>
                </div>

                <div className="space-y-2">
                  {households.map((h, index) => (
                    <div key={index} className="flex items-center gap-2">
                      <input
                        type="text"
                        value={h.name}
                        onChange={(e) => {
                          const updated = [...households];
                          updated[index].name = e.target.value;
                          setHouseholds(updated);
                        }}
                        placeholder={`Enter family name ${index + 1}`}
                        className="flex-1 px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-sm outline-none focus:ring-2 focus:ring-emerald-500"
                      />
                      {households.length > 1 && (
                        <button
                          type="button"
                          onClick={() => handleRemoveHousehold(index)}
                          className="text-gray-400 hover:text-red-500 p-2"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Participants */}
              <div className="pt-3 border-t border-gray-100 dark:border-gray-700">
                <div className="flex items-center justify-between mb-2">
                  <div>
                    <label className="text-xs font-bold text-gray-800 dark:text-gray-200 flex items-center gap-1.5">
                      <Users className="w-3.5 h-3.5 text-emerald-600" />
                      <span>Additional Participants (Optional)</span>
                    </label>
                    <span className="text-[11px] text-gray-400">
                      You are automatically enrolled. Add family members or friends below.
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={handleAddParticipant}
                    className="text-xs font-semibold text-emerald-600 hover:text-emerald-700 flex items-center gap-1"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Add Person</span>
                  </button>
                </div>

                <div className="space-y-2">
                  {participants.map((p, index) => (
                    <div key={index} className="flex items-center gap-2">
                      <input
                        type="text"
                        value={p.name}
                        onChange={(e) => {
                          const updated = [...participants];
                          updated[index].name = e.target.value;
                          setParticipants(updated);
                        }}
                        placeholder={`Enter participant name ${index + 1}`}
                        className="flex-1 px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-sm outline-none focus:ring-2 focus:ring-emerald-500"
                      />
                      <select
                        value={p.householdIndex}
                        onChange={(e) => {
                          const updated = [...participants];
                          updated[index].householdIndex = Number(e.target.value);
                          setParticipants(updated);
                        }}
                        className="w-44 px-2 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-xs outline-none focus:ring-2 focus:ring-emerald-500"
                      >
                        {households.map((h, hIdx) => (
                          <option key={hIdx} value={hIdx}>
                            {h.name.trim() || `Family ${hIdx + 1}`}
                          </option>
                        ))}
                      </select>
                      <button
                        type="button"
                        onClick={() => handleRemoveParticipant(index)}
                        className="text-gray-400 hover:text-red-500 p-2"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              {/* Form Buttons */}
              <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-100 dark:border-gray-700">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 text-sm font-semibold hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold shadow-xs disabled:opacity-50 transition-all cursor-pointer"
                >
                  {submitting ? 'Creating...' : 'Create Trip'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

