import React, { useEffect, useState } from "react";
import type { HealthDTO } from "../../services/api";
import { adminService } from "../../services/api";
import Navbar from "../../components/layout/Navbar";
import Sidebar from "../../components/layout/Sidebar";

const ServiceHealthPage: React.FC = () => {
    const [healthData, setHealthData] = useState<HealthDTO[]>([]);
    const [loading, setLoading] = useState<boolean>(true);
    const [error, setError] = useState<string | null>(null);
    const [countdown, setCountdown] = useState<number>(5);
    
    const fetchHealthData = async () => {
        try {
            const response = await adminService.getServiceHealth();
            setHealthData(response.data);
        } catch (err: any) {
            setError(err.message || "Something went wrong");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchHealthData();
    }, []);

    useEffect(() => {
        const interval = setInterval(() => {
            setCountdown(prev => {
                if (prev <= 1) {
                    fetchHealthData(); // trigger refresh
                    return 5; // reset countdown
                }
                return prev - 1;
            });
        }, 1000);

        return () => clearInterval(interval);
    }, []);

    return (
        <div className="min-h-screen bg-surface font-body text-on-surface selection:bg-primary/20">
            <Navbar />
            <div className="flex pt-0">
                <Sidebar />
                <div className="flex-1 ml-64 p-6">
                    <div className="bg-white rounded-lg shadow-md p-6">
                        <div className="grid grid-cols-2">
                            <h1 className="text-3xl font-bold mb-6 text-primary">Service Health</h1>
                            <h1 className="text-3xl text-gray-500 text-end px-12 mr-20 align-bottom">Refreshing at {countdown}s...</h1>
                        </div>

                        {loading && (
                            <div className="flex justify-center items-center py-8">
                                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                                <span className="ml-2 text-gray-600">Loading service health data...</span>
                            </div>
                        )}
                        {error && (
                            <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
                                {error}
                            </div>
                        )}

                        {!loading && !error && (
                            <div className="overflow-x-auto">
                                <table className="min-w-full divide-y divide-gray-200">
                                    <thead className="bg-gray-50">
                                        <tr>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Service Name</th>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Instances Count</th>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                                        </tr>
                                    </thead>
                                    <tbody className="bg-white divide-y divide-gray-200">
                                        {healthData.length === 0 ? (
                                            <tr>
                                                <td colSpan={3} className="px-6 py-4 text-center text-gray-500">
                                                    No service health data found
                                                </td>
                                            </tr>
                                        ) : (
                                            healthData.map((service) => (
                                                <tr key={service.serviceName} className="hover:bg-gray-50 transition-colors">
                                                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 capitalize">{service.serviceName.replaceAll(/-/g, ' ')}</td>
                                                    <td className={`px-6 py-4 whitespace-nowrap text-sm ${service.instancesCount > 0 ? 'text-green-800' : 'text-red-800'}`}>{service.instancesCount}</td>
                                                    <td className="px-6 py-4 whitespace-nowrap">
                                                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${service.serviceStatus === "UP"? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                                                            {service.serviceStatus}
                                                        </span>
                                                    </td>
                                                </tr>
                                            ))
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ServiceHealthPage;