import React, { useEffect, useState } from "react";
import type { AdminProjectStatsDTO } from "../../services/api";
import { adminService } from "../../services/api";
import { saveAs } from "file-saver";
import { TrashIcon } from "@heroicons/react/24/solid";
import Navbar from "../../components/layout/Navbar";
import Sidebar from "../../components/layout/Sidebar";

const AdminProjectPage: React.FC = () => {
    const [projectStats, setProjectStats] = useState<AdminProjectStatsDTO[]>([]);
    const [loading, setLoading] = useState<boolean>(true);
    const [error, setError] = useState<string | null>(null);

    function formatSuccessRate(rate: number): number {
        return parseFloat((rate * 100).toFixed(2));
    }

    function downloadReport(projectId: string, type: "full" | "simple") {
        const blob = type === "full" ? adminService.generateProjectFullReport(projectId) : adminService.generateProjectSimpleReport(projectId);
        const toDownload = new Blob([blob as unknown as Blob], { type: "application/pdf" });
        saveAs(toDownload, `project_${projectId}_${type}_report.pdf`);
    }

    const handleDeleteProject = (projectId: string) => {
        if(confirm("Are you sure you want to delete this project? This action cannot be undone.")) {
            // Call API to delete project
            adminService.deleteProject(projectId)
                .then(() => {
                    // Refresh project stats after deletion
                    setProjectStats(prevStats => prevStats.filter(project => project.id !== projectId));
                })
                .catch(err => {
                    alert("Failed to delete project: " + (err.message || "Unknown error"));
                });
        }
    }
    
    const fetchProjectStats = async () => {
        try {
            const response = await adminService.getAllProjectsStats();
            setProjectStats(response.data);
        } catch (err: any) {
            setError(err.message || "Something went wrong");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchProjectStats();
    }, []);

    return (
        <div className="min-h-screen bg-surface font-body text-on-surface selection:bg-primary/20">
            <Navbar />
            <div className="flex pt-0">
                <Sidebar />
                <div className="flex-1 ml-64 p-6">
                    <div className="bg-white rounded-lg shadow-md p-6">
                        <h1 className="text-3xl font-bold mb-6 text-primary">Project Stats</h1>

                        {loading && (
                            <div className="flex justify-center items-center py-8">
                                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                                <span className="ml-2 text-gray-600">Loading project stats...</span>
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
                                            <th className="px-1 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">#</th>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Project Name</th>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Description</th>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">URL</th>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Success Rate</th>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Total Tests</th>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Report</th>
                                        </tr>
                                    </thead>
                                    <tbody className="bg-white divide-y divide-gray-200">
                                        {projectStats.length === 0 ? (
                                            <tr>
                                                <td colSpan={7} className="px-6 py-4 text-center text-gray-500">
                                                    No project stats found
                                                </td>
                                            </tr>
                                        ) : (
                                            projectStats.map((project) => (
                                                <tr key={project.id} className="hover:bg-gray-50 transition-colors">
                                                    <td className="py-4 whitespace-nowrap text-sm text-gray-500">
                                                        <button className="p-1 rounded-full hover:bg-red-200 transition-colors" onClick={() => handleDeleteProject(project.id)}>
                                                            <TrashIcon className="w-4 h-4 text-red-500" />
                                                        </button>
                                                    </td>
                                                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 capitalize">{project.name}</td>
                                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{project.description}</td>
                                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-blue-500 underline">
                                                        {project.projectUrl}
                                                    </td>
                                                    <td className={`px-6 py-4 whitespace-nowrap text-sm ${formatSuccessRate(project.successRate) >= 50 ? 'text-green-800' : 'text-red-800'}`}>{formatSuccessRate(project.successRate)}%</td>
                                                    <td className="px-6 py-4 whitespace-nowrap">
                                                        <span className="py-4 px-3 text-center whitespace-nowrap text-sm text-gray-500">
                                                            {project.totalTests}
                                                        </span>
                                                    </td>
                                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                                        <div className="flex space-x-2">
                                                            <button className="px-3 py-1 bg-blue-500 text-white text-xs font-medium rounded hover:bg-blue-600 transition-colors" onClick={() => downloadReport(project.id, "full")}>Full</button>
                                                            <button className="px-3 py-1 bg-green-500 text-white text-xs font-medium rounded hover:bg-green-600 transition-colors" onClick={() => downloadReport(project.id, "simple")}>Simple</button>
                                                        </div>
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

export default AdminProjectPage;