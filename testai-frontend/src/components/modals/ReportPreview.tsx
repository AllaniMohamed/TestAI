import React, { useState, useEffect } from "react";
import { executionService } from "../../services/api";
import { saveAs } from "file-saver";

type ReportPreviewProps = {
    id: string;
    name: string;
    close: () => void;
};

const ReportPreview: React.FC<ReportPreviewProps> = ({ id, name, close }) => {
    const [fullReportData, setFullReportData] = useState<Blob | null>(null);
    const [simpleReportData, setSimpleReportData] = useState<Blob | null>(null);
    const [previewUrl, setPreviewUrl] = useState<string | null>(null);

    useEffect(() => {
        const fetchReportData = async () => {
            try {
                const fullReportResponse = await executionService.getProjectReport(id);
                const simpleReportResponse = await executionService.getSimpleProjectReport(id);

                setFullReportData(fullReportResponse.data);
                setSimpleReportData(simpleReportResponse.data);

                // Default preview = full report
                const url = URL.createObjectURL(fullReportResponse.data);
                setPreviewUrl(url);
            } catch (error) {
                console.error("Error fetching report data:", error);
            }
        };

        fetchReportData();

        return () => {
            if (previewUrl) URL.revokeObjectURL(previewUrl);
        };
    }, [id]);

    const downloadFile = (blob: Blob | null, type: string) => {
        if (!blob) return;
        const blobToDownload = new Blob([blob], { type: "application/pdf" });
        saveAs(blobToDownload, `${name || "project"}-${type}-report.pdf`);
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
            {/* Overlay */}
            <div
                className="absolute inset-0 bg-black/70 backdrop-blur-sm"
                onClick={close}
            />

            {/* Modal */}
            <div className="relative z-10 w-[60%] h-[90%] bg-white rounded-2xl shadow-2xl flex flex-col overflow-hidden">

                {/* Header */}
                <div className="flex justify-between items-center px-4 ">
                    <div className="flex gap-3 p-4 border-b">
                    <button
                        onClick={() => downloadFile(fullReportData, "full")}
                        className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
                    >
                        Download Full Report
                    </button>

                    <button
                        onClick={() => downloadFile(simpleReportData, "simple")}
                        className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition"
                    >
                        Download Simple Report
                    </button>
                </div>

                    <button
                        onClick={close}
                        className="text-gray-500 hover:text-black text-[2rem] font-bold"
                    >
                        ✕
                    </button>
                </div>
                

                {/* PDF Viewer */}
                <div className="flex-1">
                    {previewUrl ? (
                        <iframe
                            src={previewUrl}
                            className="w-full h-full"
                            title="PDF Preview"
                        />
                    ) : (
                        <div className="flex items-center justify-center h-full text-gray-500">
                            Loading preview...
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default ReportPreview;