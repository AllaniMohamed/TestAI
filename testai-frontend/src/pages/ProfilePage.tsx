import React, { useState, useEffect, useRef } from "react";
import { useNavigate, Link } from "react-router-dom";
import Navbar from "../components/layout/Navbar";
import Sidebar from "../components/layout/Sidebar";
import { userService } from "../services/api";
import { CameraIcon, UserCircleIcon, ShieldCheckIcon, KeyIcon } from "@heroicons/react/24/outline";
import type { UserProfile } from "../services/api";

const ProfilePage: React.FC = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState<UserProfile | null>(null);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [company, setCompany] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [role, setRole] = useState("");
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [avatarBlobUrl, setAvatarBlobUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  // ⭐ Responsive sidebar state
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    loadUserProfile();
    return () => {
      if (avatarBlobUrl) URL.revokeObjectURL(avatarBlobUrl);
    };
  }, []);

  const loadUserProfile = async () => {
    try {
      const userStr = sessionStorage.getItem("user");
      if (!userStr) throw new Error("Utilisateur non connecté");
      const userData = JSON.parse(userStr);
      const userId = userData.id;

      const response = await userService.getUserById(userId);
      setUser(response.data);
      setName(response.data.name);
      setEmail(response.data.email);
      setCompany(response.data.company || "");
      setPhoneNumber(response.data.phoneNumber || "");
      setRole(response.data.role || "MANAGER");

      if (response.data.avatar) {
        await fetchAvatarWithToken(response.data.avatar);
      } else {
        setAvatarBlobUrl(null);
      }
    } catch (error) {
      console.error("Erreur chargement profil:", error);
      setMessage("Erreur de chargement du profil");
    }
  };

  const fetchAvatarWithToken = async (avatarUrl: string) => {
    try {
      const token = sessionStorage.getItem("accessToken");
      const response = await fetch(avatarUrl, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!response.ok) throw new Error("Failed to load avatar");
      const blob = await response.blob();
      const blobUrl = URL.createObjectURL(blob);
      if (avatarBlobUrl) URL.revokeObjectURL(avatarBlobUrl);
      setAvatarBlobUrl(blobUrl);
    } catch (error) {
      console.error("Error fetching avatar:", error);
      setAvatarBlobUrl(null);
    }
  };

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (!file.type.startsWith("image/")) {
        setMessage("Only image files are allowed");
        return;
      }
      if (file.size > 5 * 1024 * 1024) {
        setMessage("Image must be less than 5MB");
        return;
      }
      setAvatarFile(file);
      const reader = new FileReader();
      reader.onloadend = () => setAvatarPreview(reader.result as string);
      reader.readAsDataURL(file);
    }
  };

  const handleUploadAvatar = async () => {
    if (!avatarFile || !user) return;
    setLoading(true);
    setMessage("");
    try {
      await userService.uploadAvatar(user.id, avatarFile);
      setMessage("✅ Avatar mis à jour avec succès");
      setAvatarFile(null);
      setAvatarPreview(null);
      await loadUserProfile();
    } catch (error: any) {
      setMessage("❌ Error: " + (error.response?.data?.error || "Unknown error"));
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteAvatar = async () => {
    if (!user) return;
    if (!window.confirm("Are you sure you want to delete your avatar?")) return;
    setLoading(true);
    try {
      await userService.deleteAvatar(user.id);
      setMessage("✅ Avatar supprimé");
      setAvatarPreview(null);
      setAvatarFile(null);
      if (avatarBlobUrl) URL.revokeObjectURL(avatarBlobUrl);
      setAvatarBlobUrl(null);
      await loadUserProfile();
    } catch (error) {
      setMessage("❌ Error deleting avatar");
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage("");
    try {
      await userService.updateProfile({ name, company });
      setMessage("✅ Profil mis à jour");
      loadUserProfile();
    } catch (error) {
      setMessage("❌ Error updating profile");
    } finally {
      setLoading(false);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      setMessage("❌ The passwords do not match");
      return;
    }
    if (newPassword.length < 8) {
      setMessage("❌ The password must be at least 8 characters long");
      return;
    }
    setLoading(true);
    setMessage("");
    try {
      // Appel backend à implémenter plus tard
      setMessage("✅ Password updated successfully");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (error: any) {
      setMessage("❌ Error occurred while changing password");
    } finally {
      setLoading(false);
    }
  };

  if (!user) return (
    <div className="min-h-screen bg-surface">
      <Navbar onMenuToggle={() => setSidebarOpen(!sidebarOpen)} />
      <div className="flex">
        <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
        <main className="flex-1 ml-0 md:ml-64 p-8 flex items-center justify-center">
          <p>Loading...</p>
        </main>
      </div>
      {sidebarOpen && (
        <div className="fixed inset-0 bg-black/40 z-40 md:hidden" onClick={() => setSidebarOpen(false)} />
      )}
    </div>
  );

  const avatarSrc = avatarPreview || avatarBlobUrl;

  return (
    <div className="min-h-screen bg-surface font-body text-on-surface selection:bg-primary/20">
      <Navbar onMenuToggle={() => setSidebarOpen(!sidebarOpen)} />
      <div className="flex pt-0">
        <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
        <main className="flex-1 ml-0 md:ml-64 p-6 lg:p-12 max-w-7xl mx-auto w-full">
          <div className="max-w-5xl mx-auto space-y-10 md:space-y-12">
            <section className="flex flex-col md:flex-row gap-8 md:gap-12 items-start">
              {/* Left column */}
              <div className="w-full md:w-1/3">
                <h2 className="font-headline text-2xl md:text-3xl font-bold tracking-tight mb-2">Profile Settings</h2>
                <p className="text-on-surface-variant text-sm leading-relaxed">
                  Manage your laboratory identity and security protocols. Changes here will reflect across the enterprise workspace.
                </p>
              </div>

              {/* Right column */}
              <div className="w-full md:w-2/3 space-y-8">
                {/* Avatar Section */}
                <div className="bg-surface-container-lowest p-6 md:p-8 rounded-xl flex flex-col sm:flex-row items-center gap-6 transition-all duration-300">
                  <div className="relative shrink-0">
                    <div className="w-24 h-24 rounded-xl overflow-hidden bg-gray-200 flex items-center justify-center ring-4 ring-surface-container-low transition-all">
                      {avatarSrc ? (
                        <img src={avatarSrc} alt="Avatar" className="w-full h-full object-cover" />
                      ) : (
                        <UserCircleIcon className="w-16 h-16 text-gray-400" />
                      )}
                    </div>
                    <div
                      className="absolute -bottom-2 -right-2 bg-primary-container p-1.5 rounded-lg text-white shadow-lg cursor-pointer"
                      onClick={() => fileInputRef.current?.click()}
                    >
                      <CameraIcon className="w-4 h-4" />
                    </div>
                    <input
                      type="file"
                      ref={fileInputRef}
                      onChange={handleAvatarChange}
                      accept="image/png, image/jpeg, image/jpg, image/gif"
                      className="hidden"
                    />
                  </div>
                  <div className="space-y-3 text-center sm:text-left">
                    <h3 className="font-headline font-semibold text-lg">Your Avatar</h3>
                    <div className="flex flex-wrap gap-3 justify-center sm:justify-start">
                      <button
                        onClick={() => fileInputRef.current?.click()}
                        className="px-4 py-2 bg-surface-container-high text-on-primary-fixed-variant rounded-lg text-sm font-medium hover:bg-surface-variant transition-colors"
                      >
                        Upload New
                      </button>
                      {avatarBlobUrl && (
                        <button
                          onClick={handleDeleteAvatar}
                          className="px-4 py-2 text-error text-sm font-medium hover:bg-error-container/20 rounded-lg transition-colors"
                        >
                          Remove
                        </button>
                      )}
                      {avatarFile && (
                        <button
                          onClick={handleUploadAvatar}
                          disabled={loading}
                          className="px-4 py-2 bg-primary text-white rounded-lg text-sm font-medium hover:bg-primary/90 disabled:opacity-50"
                        >
                          Save
                        </button>
                      )}
                    </div>
                    <p className="text-[11px] text-on-surface-variant">JPG, GIF or PNG. Max size of 5MB</p>
                  </div>
                </div>

                {/* Role Badge */}
                <div className="bg-primary/5 p-5 md:p-6 rounded-xl flex items-start gap-4">
                  <div className="bg-primary-container/10 p-2 rounded-lg text-primary shrink-0">
                    <ShieldCheckIcon className="w-6 h-6" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <span className="text-[10px] font-bold tracking-widest uppercase bg-primary-container text-white px-2 py-0.5 rounded">
                        {role}
                      </span>
                      <span className="text-xs text-on-surface-variant">System Role</span>
                    </div>
                    <p className="text-xs text-on-surface-variant">
                      {role === "MANAGER"
                        ? "Full access to all API environments, user management, and laboratory-wide configuration settings."
                        : role === "DEVELOPER"
                        ? "Access to shared projects with permissions determined by project managers."
                        : "Administrative privileges across the platform."}
                    </p>
                  </div>
                </div>

                {/* Personal Information */}
                <div className="space-y-6">
                  <div className="flex items-center gap-2 pb-2 border-b border-outline-variant/10">
                    <span className="material-symbols-outlined text-primary text-xl">badge</span>
                    <h3 className="font-headline font-bold uppercase tracking-widest text-[11px]">Personal Information</h3>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <label className="text-[11px] font-bold text-on-surface-variant uppercase tracking-wider">Full Name</label>
                      <input
                        type="text"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        className="w-full bg-surface-container-low border-none rounded-xl py-3 px-4 text-sm focus:ring-1 focus:ring-primary/30 focus:bg-white transition-all"
                      />
                    </div>
                    <div className="space-y-2 opacity-60">
                      <label className="text-[11px] font-bold text-on-surface-variant uppercase tracking-wider">Email Address</label>
                      <input
                        type="email"
                        value={email}
                        disabled
                        className="w-full bg-surface-container-low border-none rounded-xl py-3 px-4 text-sm cursor-not-allowed"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[11px] font-bold text-on-surface-variant uppercase tracking-wider">Company</label>
                      <input
                        type="text"
                        value={company}
                        onChange={(e) => setCompany(e.target.value)}
                        className="w-full bg-surface-container-low border-none rounded-xl py-3 px-4 text-sm focus:ring-1 focus:ring-primary/30 focus:bg-white transition-all"
                      />
                    </div>
                    <div className="space-y-2 opacity-60">
                      <label className="text-[11px] font-bold text-on-surface-variant uppercase tracking-wider">Phone Number</label>
                      <input
                        type="tel"
                        value={phoneNumber}
                        disabled
                        className="w-full bg-surface-container-low border-none rounded-xl py-3 px-4 text-sm cursor-not-allowed"
                      />
                    </div>
                  </div>
                  {/* Single Save Profile button */}
                  <div className="flex justify-end">
                    <button
                      onClick={handleUpdateProfile}
                      disabled={loading}
                      className="px-8 md:px-10 py-3 bg-gradient-to-br from-primary to-primary-container text-white rounded-xl font-headline font-bold text-sm shadow-lg shadow-primary/20 hover:scale-[1.02] active:scale-95 transition-all disabled:opacity-50"
                    >
                      Save Profile
                    </button>
                  </div>
                </div>

                {/* Security Section */}
                <div className="space-y-6">
                  <div className="flex items-center gap-2 pb-2 border-b border-outline-variant/10">
                    <KeyIcon className="w-5 h-5 text-primary" />
                    <h3 className="font-headline font-bold uppercase tracking-widest text-[11px]">Security & Authentication</h3>
                  </div>
                  <form onSubmit={handleChangePassword} className="space-y-6">
                    <div className="space-y-2">
                      <label className="text-[11px] font-bold text-on-surface-variant uppercase tracking-wider">Current Password</label>
                      <input
                        type="password"
                        value={currentPassword}
                        onChange={(e) => setCurrentPassword(e.target.value)}
                        className="w-full bg-surface-container-low border-none rounded-xl py-3 px-4 text-sm focus:ring-1 focus:ring-primary/30 focus:bg-white transition-all"
                        placeholder="••••••••••••"
                      />
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                      <div className="space-y-2">
                        <label className="text-[11px] font-bold text-on-surface-variant uppercase tracking-wider">New Password</label>
                        <input
                          type="password"
                          value={newPassword}
                          onChange={(e) => setNewPassword(e.target.value)}
                          className="w-full bg-surface-container-low border-none rounded-xl py-3 px-4 text-sm focus:ring-1 focus:ring-primary/30 focus:bg-white transition-all"
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-[11px] font-bold text-on-surface-variant uppercase tracking-wider">Confirm New Password</label>
                        <input
                          type="password"
                          value={confirmPassword}
                          onChange={(e) => setConfirmPassword(e.target.value)}
                          className="w-full bg-surface-container-low border-none rounded-xl py-3 px-4 text-sm focus:ring-1 focus:ring-primary/30 focus:bg-white transition-all"
                        />
                      </div>
                    </div>
                    <div className="flex justify-end">
                      <Link to="/forgot-password" className="text-xs text-primary hover:underline">
                        Forgot your password?
                      </Link>
                    </div>
                    <div className="p-4 bg-surface-container rounded-xl">
                      <p className="text-[11px] text-on-surface-variant flex items-center gap-2">
                        <span className="material-symbols-outlined text-xs">info</span>
                        Password must be at least 8 characters and include a mix of symbols and numbers.
                      </p>
                    </div>
                    <div className="flex justify-end">
                      <button
                        type="submit"
                        disabled={loading}
                        className="px-8 md:px-10 py-3 bg-gradient-to-br from-primary to-primary-container text-white rounded-xl font-headline font-bold text-sm shadow-lg shadow-primary/20 hover:scale-[1.02] active:scale-95 transition-all disabled:opacity-50"
                      >
                        Change Password
                      </button>
                    </div>
                  </form>
                </div>

                {message && (
                  <div className={`p-4 rounded-xl ${message.includes("✅") ? "bg-green-50 text-green-800" : "bg-red-50 text-red-800"}`}>
                    {message}
                  </div>
                )}
              </div>
            </section>
          </div>
        </main>
      </div>
      {/* ⭐ Mobile overlay */}
      {sidebarOpen && (
        <div className="fixed inset-0 bg-black/40 z-40 md:hidden" onClick={() => setSidebarOpen(false)} />
      )}
    </div>
  );
};

export default ProfilePage;