import React, { useState } from 'react';
import { XMarkIcon, PaperAirplaneIcon } from '@heroicons/react/24/outline';
import { sharedAccessService } from '../../services/api';
import Button from '../common/Button';

interface ShareProjectModalProps {
  projectId: string;
  projectName: string;
  onClose: () => void;
  onSuccess: () => void;
}

const ShareProjectModal: React.FC<ShareProjectModalProps> = ({
  projectId,
  projectName,
  onClose,
  onSuccess,
}) => {
  const [email, setEmail] = useState('');
  const [accessLevel, setAccessLevel] = useState<'READ_ONLY' | 'READ_WRITE'>('READ_ONLY');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const handleShare = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      await sharedAccessService.shareProject(projectId, {
        developerEmail: email,
        accessLevel,
      });

      setSuccess(true);
      setTimeout(() => {
        onSuccess();
        onClose();
      }, 2000);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Erreur lors du partage');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-3xl shadow-2xl max-w-md w-full animate-fadeIn">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-100">
          <h2 className="text-2xl font-extrabold text-slate-900">
            Share the service
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition p-2 hover:bg-gray-100 rounded-xl"
          >
            <XMarkIcon className="h-6 w-6" />
          </button>
        </div>

        {/* Body */}
        <form onSubmit={handleShare} className="p-6 space-y-6">
          {/* Project Name */}
          <div className="bg-blue-50 p-4 rounded-2xl">
            <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">
              Service :
            </p>
            <p className="font-black text-slate-900 text-lg">{projectName}</p>
          </div>

          {/* Email */}
          <div>
            <label className="block text-sm font-bold text-gray-700 mb-2">
              Developer's Email
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="dev@company.com"
              required
              className="w-full px-4 py-3 border border-gray-200 rounded-2xl focus:ring-4 focus:ring-primary/10 focus:border-primary outline-none transition"
            />
          </div>

          {/* Access Level */}
          <div>
            <label className="block text-sm font-bold text-gray-700 mb-3">
              Access Level
            </label>
            <div className="space-y-3">
              <label className="flex items-start p-4 border-2 rounded-2xl cursor-pointer hover:bg-gray-50 transition has-[:checked]:border-primary has-[:checked]:bg-primary/5">
                <input
                  type="radio"
                  name="accessLevel"
                  value="READ_ONLY"
                  checked={accessLevel === 'READ_ONLY'}
                  onChange={() => setAccessLevel('READ_ONLY')}
                  className="mt-1 mr-3 accent-primary"
                />
                <div className="flex-1">
                  <p className="font-bold text-slate-900">Read Only</p>
                  <p className="text-sm text-gray-500 mt-1">
                    View tests and reports
                  </p>
                </div>
              </label>

              <label className="flex items-start p-4 border-2 rounded-2xl cursor-pointer hover:bg-gray-50 transition has-[:checked]:border-primary has-[:checked]:bg-primary/5">
                <input
                  type="radio"
                  name="accessLevel"
                  value="READ_WRITE"
                  checked={accessLevel === 'READ_WRITE'}
                  onChange={() => setAccessLevel('READ_WRITE')}
                  className="mt-1 mr-3 accent-primary"
                />
                <div className="flex-1">
                  <p className="font-bold text-slate-900">Read and Execute</p>
                  <p className="text-sm text-gray-500 mt-1">
                    View and execute tests
                  </p>
                </div>
              </label>
            </div>
          </div>

          {/* Error */}
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-2xl text-sm font-medium">
              ⚠️ {error}
            </div>
          )}

          {/* Success */}
          {success && (
            <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-2xl text-sm font-medium">
              ✅ Invitation sent successfully!
            </div>
          )}

          {/* Buttons */}
          <div className="flex gap-3 pt-4">
            <Button
              type="button"
              onClick={onClose}
              variant="outline"
              className="flex-1"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              loading={loading}
              disabled={success}
              className="flex-1"
              icon={!loading && <PaperAirplaneIcon className="h-5 w-5" />}
            >
              {loading ? 'Sending...' : 'Send Invitation'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ShareProjectModal;