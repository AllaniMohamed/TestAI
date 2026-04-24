import React, { useState, useEffect } from "react";
import { adminService } from "../../services/api";
import type { FullUser } from "../../services/api";

type UserFullModalProps = {
    userId: string;
    close: () => void;
    viewOnly?: boolean; // optional prop to disable actions
};

const UserFullModal: React.FC<UserFullModalProps> = ({ userId, close, viewOnly }) => {
    const [userData, setUserData] = useState<FullUser | null>(null);
    const [loading, setLoading] = useState<boolean>(true);
    const [error, setError] = useState<string | null>(null);
    const [processing, setProcessing] = useState<boolean>(false);

    useEffect(() => {
        const fetchUserData = async () => {
            try {
                const response = await adminService.getFullUserById(userId);
                setUserData(response.data as FullUser);
            } catch (err: any) {
                setError(err.message || "Something went wrong");
            } finally {
                setLoading(false);
            }
        };

        fetchUserData();
    }, [userId]);

    const handleActivate = async () => {
        if (!userData) return;
        try {
            setProcessing(true);
            await adminService.toggleUserActive(userId); // adjust to your API
            setUserData({ ...userData, isActive: !userData.isActive });
        } catch (err: any) {
            alert(err.message || "Failed to activate user");
        } finally {
            setProcessing(false);
        }
    };

    const handleDelete = async () => {
        if (!confirm("Are you sure you want to delete this user?")) return;
        try {
            setProcessing(true);
            await adminService.deleteUser(userId); // adjust to your API
            close(); // close after delete
        } catch (err: any) {
            alert(err.message || "Failed to delete user");
        } finally {
            setProcessing(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
            {/* Overlay */}
            <div
                className="absolute inset-0 bg-black bg-opacity-50"
                onClick={close}
            />

            {/* Modal */}
            <div
                className="relative bg-white p-6 rounded-lg shadow-lg w-[400px]"
                onClick={(e) => e.stopPropagation()} // prevent closing when clicking inside
            >
                {/* Close Button */}
                <button
                    onClick={close}
                    className="absolute top-2 right-2 text-gray-500 hover:text-black text-lg"
                >
                    ✕
                </button>

                <h2 className="text-xl font-bold mb-4">User Details</h2>

                {loading && <p>Loading...</p>}
                {error && <p className="text-red-500">{error}</p>}

                {!loading && !error && userData && (
                    <>
                        <div className="space-y-2 mb-4">
                            <p><strong>Name:</strong> {userData.name}</p>
                            <p><strong>Email:</strong> {userData.email}</p>
                            <p><strong>Role:</strong> {userData.role}</p>
                            <p><strong>Company:</strong> {userData.company || "Not specified"}</p>
                            <p>
                                <strong>Status:</strong>{" "}
                                {userData.isActive ? "Active" : "Inactive"}
                            </p>
                        </div>

                        {/* Actions */}
                        {!viewOnly && (
                        <div className="flex justify-between gap-2">
                            <button
                                onClick={handleActivate}
                                className={`${userData.isActive ? "bg-red-600" : "bg-green-600"} text-white px-4 py-2 rounded disabled:opacity-50`}
                            >
                                {userData.isActive ? "Deactivate" : "Activate"}
                            </button>

                            <button
                                onClick={handleDelete}
                                disabled={processing}
                                className="bg-red-600 text-white px-4 py-2 rounded"
                            >
                                Delete User
                            </button>
                        </div>)}
                    </>
                )}
            </div>
        </div>
    );
};

export default UserFullModal;