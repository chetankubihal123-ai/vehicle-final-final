import React, { useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
    X,
    User,
    Phone,
    Calendar,
    MapPin,
    Camera,
    Loader2,
    Check
} from "lucide-react";
import { useAuth } from "../contexts/AuthContext";
import { API_URL } from "../config";

interface ProfileModalProps {
    isOpen: boolean;
    onClose: () => void;
}

export default function ProfileModal({ isOpen, onClose }: ProfileModalProps) {
    const { user, updateProfile, uploadProfilePic, apiLoading } = useAuth();
    const fileInputRef = useRef<HTMLInputElement>(null);

    const [formData, setFormData] = useState({
        name: user?.name || "",
        phone: user?.phone || "",
        dob: user?.dob || "",
        address: user?.address || "",
        gender: user?.gender || "",
    });

    const [uploading, setUploading] = useState(false);
    const [success, setSuccess] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            await updateProfile(formData);
            setSuccess(true);
            setTimeout(() => setSuccess(false), 3000);
        } catch (err) {
            console.error("Failed to update profile", err);
            alert("Failed to update profile. Please try again.");
        }
    };

    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            setUploading(true);
            try {
                await uploadProfilePic(file);
                setSuccess(true);
                setTimeout(() => setSuccess(false), 3000);
            } catch (err) {
                console.error("Failed to upload image", err);
                alert("Failed to upload image. Please try again.");
            } finally {
                setUploading(false);
            }
        }
    };

    const profileImageUrl = user?.profilePic
        ? (user.profilePic.startsWith('http') ? user.profilePic : `${API_URL}${user.profilePic}`)
        : `https://api.dicebear.com/7.x/avataaars/svg?seed=${user?.name}&mood=smiling&backgroundColor=b6e3f4,c0aede,d1d4f9,ffd5dc,ffdfbf`;

    return (
        <AnimatePresence>
            {isOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={onClose}
                        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
                    />

                    <motion.div
                        initial={{ scale: 0.95, opacity: 0, y: 20 }}
                        animate={{ scale: 1, opacity: 1, y: 0 }}
                        exit={{ scale: 0.95, opacity: 0, y: 20 }}
                        className="relative w-full max-w-lg bg-white rounded-3xl shadow-2xl overflow-hidden"
                    >
                        {/* Header */}
                        <div className="relative h-32 bg-gradient-to-r from-blue-600 to-indigo-700 p-6">
                            <button
                                onClick={onClose}
                                className="absolute top-4 right-4 p-2 text-white/80 hover:text-white transition-colors"
                            >
                                <X className="h-6 w-6" />
                            </button>
                            <h2 className="text-2xl font-bold text-white">Profile Settings</h2>
                            <p className="text-blue-100 text-sm">Update your personal information</p>
                        </div>

                        {/* Content */}
                        <div className="px-8 pb-8 -mt-12">
                            <div className="flex flex-col items-center">
                                <div className="relative group">
                                    <div className="w-32 h-32 rounded-full border-4 border-white shadow-xl overflow-hidden bg-gray-100">
                                        <img
                                            src={profileImageUrl}
                                            alt={user?.name}
                                            className="w-full h-full object-cover"
                                        />
                                        {uploading && (
                                            <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                                                <Loader2 className="h-8 w-8 text-white animate-spin" />
                                            </div>
                                        )}
                                    </div>
                                    <button
                                        onClick={() => fileInputRef.current?.click()}
                                        className="absolute bottom-0 right-0 p-3 bg-white rounded-full shadow-lg border border-gray-100 text-indigo-600 hover:scale-110 transition-transform active:scale-95"
                                        disabled={uploading}
                                    >
                                        <Camera className="h-5 w-5" />
                                    </button>
                                    <input
                                        type="file"
                                        ref={fileInputRef}
                                        onChange={handleFileChange}
                                        accept="image/*"
                                        className="hidden"
                                    />
                                </div>

                                <form onSubmit={handleSubmit} className="w-full mt-8 space-y-4">
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div className="space-y-1">
                                            <label className="text-xs font-semibold text-gray-500 ml-1">Full Name</label>
                                            <div className="relative">
                                                <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                                                <input
                                                    type="text"
                                                    required
                                                    value={formData.name}
                                                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                                    className="w-full pl-10 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all outline-none"
                                                />
                                            </div>
                                        </div>

                                        <div className="space-y-1">
                                            <label className="text-xs font-semibold text-gray-500 ml-1">Phone Number</label>
                                            <div className="relative">
                                                <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                                                <input
                                                    type="tel"
                                                    value={formData.phone}
                                                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                                                    className="w-full pl-10 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all outline-none"
                                                    placeholder="+91 XXXXX XXXXX"
                                                />
                                            </div>
                                        </div>

                                        <div className="space-y-1">
                                            <label className="text-xs font-semibold text-gray-500 ml-1">Date of Birth</label>
                                            <div className="relative">
                                                <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                                                <input
                                                    type="date"
                                                    value={formData.dob}
                                                    onChange={(e) => setFormData({ ...formData, dob: e.target.value })}
                                                    className="w-full pl-10 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all outline-none"
                                                />
                                            </div>
                                        </div>

                                        <div className="space-y-1">
                                            <label className="text-xs font-semibold text-gray-500 ml-1">Gender</label>
                                            <div className="flex bg-gray-50 p-1 border border-gray-200 rounded-xl">
                                                <button
                                                    type="button"
                                                    onClick={() => setFormData({ ...formData, gender: "male" })}
                                                    className={`flex-1 flex items-center justify-center gap-2 py-1.5 rounded-lg text-sm font-medium transition-all ${formData.gender === "male"
                                                        ? "bg-white text-indigo-600 shadow-sm"
                                                        : "text-gray-500 hover:text-gray-700"
                                                        }`}
                                                >
                                                    Male
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={() => setFormData({ ...formData, gender: "female" })}
                                                    className={`flex-1 flex items-center justify-center gap-2 py-1.5 rounded-lg text-sm font-medium transition-all ${formData.gender === "female"
                                                        ? "bg-white text-indigo-600 shadow-sm"
                                                        : "text-gray-500 hover:text-gray-700"
                                                        }`}
                                                >
                                                    Female
                                                </button>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="space-y-1">
                                        <label className="text-xs font-semibold text-gray-500 ml-1">Address</label>
                                        <div className="relative">
                                            <MapPin className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                                            <textarea
                                                value={formData.address}
                                                onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                                                className="w-full pl-10 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all outline-none min-h-[80px] resize-none"
                                                placeholder="Enter your street address..."
                                            />
                                        </div>
                                    </div>

                                    <button
                                        type="submit"
                                        disabled={apiLoading}
                                        className={`w-full py-3 rounded-2xl font-bold flex items-center justify-center gap-2 transition-all ${success
                                            ? "bg-green-500 text-white"
                                            : "bg-indigo-600 hover:bg-indigo-700 text-white shadow-lg hover:shadow-indigo-500/30"
                                            } disabled:opacity-50`}
                                    >
                                        {apiLoading ? (
                                            <Loader2 className="h-5 w-5 animate-spin" />
                                        ) : success ? (
                                            <>
                                                <Check className="h-5 w-5" />
                                                Saved Successfully
                                            </>
                                        ) : (
                                            "Save Changes"
                                        )}
                                    </button>
                                </form>
                            </div>
                        </div>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    );
}
