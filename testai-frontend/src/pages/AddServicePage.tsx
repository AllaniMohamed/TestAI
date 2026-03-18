import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import Navbar from "../components/layout/Navbar";
import Sidebar from "../components/layout/Sidebar";
import Card from "../components/common/Card";
import Input from "../components/common/Input";
import Button from "../components/common/Button";
import { DocMode, AuthType } from "../types/types";
import { projectService } from "../services/api";
import {
  DocumentIcon,
  LinkIcon,
  ArrowPathIcon,
  PlusIcon,
  TrashIcon,
} from "@heroicons/react/24/outline";

const AddServicePage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<DocMode>(DocMode.SWAGGER);
  const [uploadMethod, setUploadMethod] = useState<"url" | "file">("url");
  const [validServiceUrl, setValidServiceUrl] = useState(true);
  const [validDocUrl, setValidDocUrl] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [authType, setAuthType] = useState(AuthType.NONE);
  const [manualEndpoints, setManualEndpoints] = useState([
    { method: "GET", path: "", description: "" },
  ]);

  // Form data
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    projectUrl: "",
    docUrl: "",
    docFile: null as File | null,
    authCredentials: "",
  });

  const navigate = useNavigate();

  const isValidServiceUrl = (url: string, isDoc: boolean) => {
    const regex = /^(https?:\/\/)(localhost|[\w.-]+)(:\d+)?(\/.*)?$/i;
    let valid = regex.test(url);

    if (isDoc) {
      valid =
        valid &&
        (url.endsWith(".json") ||
          url.endsWith(".yaml") ||
          url.endsWith(".yml"));
      setValidDocUrl(valid);
      return;
    }
    setValidServiceUrl(valid);
  };

  const handleInputChange = (field: string, value: string | File | null) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      // ✅ Get the real user ID from localStorage
const userStr = localStorage.getItem('user');
let userId: string | null = null;
if (userStr) {
  try {
    const user = JSON.parse(userStr);
    userId = user.id;
  } catch (e) {
    console.error('Failed to parse user from localStorage', e);
  }
}
if (!userId) {
  setError("Utilisateur non connecté. Veuillez vous reconnecter.");
  setLoading(false);
  return;
}

      // Préparer les données du projet
      const projectData: any = {
        name: formData.name,
        description: formData.description,
        projectUrl: formData.projectUrl,
        docMode: activeTab,
        docSubmitMode: uploadMethod,
        authType: authType,
        userId: userId,
      };

      // Ajouter l'URL ou le fichier Swagger
      if (activeTab === DocMode.SWAGGER) {
        if (uploadMethod === "url") {
          projectData.docUrl = formData.docUrl;
        } else {
          projectData.docFile = formData.docFile;
        }
      }

      // Ajouter les credentials si nécessaire
      if (authType !== AuthType.NONE) {
        projectData.authCredentials = formData.authCredentials;
      }

      console.log("📤 Envoi des données du projet:", projectData);

      // Envoyer la requête au backend
      const response = await projectService.createProject(projectData);

      console.log("✅ Projet créé:", response.data);

      // Rediriger vers la page de détails du projet
      navigate(`/service/${response.data.id}`);
    } catch (err: any) {
      console.error("❌ Erreur lors de la création du projet:", err);
      setError(
        err.response?.data?.message || "Erreur lors de la création du projet",
      );
    } finally {
      setLoading(false);
    }
  };

  const addManualEndpoint = () => {
    setManualEndpoints([
      ...manualEndpoints,
      { method: "GET", path: "", description: "" },
    ]);
  };

  const removeManualEndpoint = (index: number) => {
    setManualEndpoints(manualEndpoints.filter((_, i) => i !== index));
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="flex">
        <Sidebar />
        <main className="flex-1 p-6 md:p-10 max-w-4xl mx-auto w-full">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900">
              Ajouter un service
            </h1>
            <p className="text-gray-500">
              Connectez votre API pour que l'IA puisse générer les tests.
            </p>
          </div>

          {/* Afficher les erreurs */}
          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-red-600 font-medium">{error}</p>
            </div>
          )}

          <Card className="mb-8 p-0 overflow-hidden">
            {/* Tabs */}
            <div className="flex border-b border-gray-200 bg-gray-50">
              <TabButton
                active={activeTab === DocMode.SWAGGER}
                onClick={() => setActiveTab(DocMode.SWAGGER)}
                icon={<DocumentIcon className="w-5 h-5" />}
              >
                SWAGGER / OpenAPI
              </TabButton>
              <TabButton
                active={activeTab === DocMode.MANUAL}
                onClick={() => setActiveTab(DocMode.MANUAL)}
                icon={<LinkIcon className="w-5 h-5" />}
              >
                Saisie Manuelle
              </TabButton>
            </div>

            <div className="p-8">
              <form onSubmit={handleSubmit}>
                {activeTab === DocMode.SWAGGER && (
                  <div className="space-y-6">
                    <Input
                      label="Nom du service"
                      placeholder="ex: User Management API"
                      required
                      value={formData.name}
                      onChange={(e) =>
                        handleInputChange("name", e.target.value)
                      }
                    />

                    <Input
                      label="Description du service"
                      placeholder="ex: This service manages user accounts and authentication."
                      required
                      value={formData.description}
                      onChange={(e) =>
                        handleInputChange("description", e.target.value)
                      }
                    />

                    <Input
                      label="URL de base du service"
                      placeholder="http://api.example.com/v1"
                      required
                      value={formData.projectUrl}
                      onChange={(e) =>
                        handleInputChange("projectUrl", e.target.value)
                      }
                      onBlur={(e) => isValidServiceUrl(e.target.value, false)}
                      error={!validServiceUrl ? "URL invalide" : undefined}
                    />

                    <div className="bg-gray-50 p-6 rounded-xl border border-gray-200">
                      <p className="text-sm font-semibold text-gray-600 mb-4">
                        Documentation Swagger (Sélectionnez une méthode
                        d'importation)
                      </p>

                      <div className="grid md:grid-cols-2 gap-6">
                        <div
                          className={`p-5 border rounded-xl hover:border-primary transition cursor-pointer ${uploadMethod === "url" ? "border-primary bg-primary-100" : ""}`}
                          onClick={() => setUploadMethod("url")}
                        >
                          <Input
                            label="URL Swagger"
                            placeholder="https://.../swagger.json"
                            disabled={uploadMethod !== "url"}
                            value={
                              uploadMethod === "url" ? formData.docUrl : ""
                            }
                            onChange={(e) =>
                              handleInputChange("docUrl", e.target.value)
                            }
                            onBlur={(e) =>
                              isValidServiceUrl(e.target.value, true)
                            }
                            error={
                              !validDocUrl && uploadMethod === "url"
                                ? "URL Doc invalide"
                                : undefined
                            }
                          />
                        </div>

                        <div
                          className={`p-5 border rounded-xl hover:border-primary transition cursor-pointer ${uploadMethod === "file" ? "border-primary bg-primary-100" : ""}`}
                          onClick={() => {
                            setUploadMethod("file");
                            setValidDocUrl(true);
                          }}
                        >
                          <Input
                            label="Fichier Swagger"
                            type="file"
                            accept=".json,.yaml,.yml"
                            className="bg-white"
                            disabled={uploadMethod !== "file"}
                            onChange={(e) =>
                              handleInputChange(
                                "docFile",
                                e.target.files?.[0] || null,
                              )
                            }
                          />
                        </div>
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Authentification
                      </label>
                      <select
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary outline-none"
                        value={authType}
                        onChange={(e) =>
                          setAuthType(e.target.value as AuthType)
                        }
                      >
                        <option value={AuthType.NONE}>Aucune</option>
                        <option value={AuthType.APIKEY}>API Key</option>
                        <option value={AuthType.BEARER}>Bearer Token</option>
                        <option value={AuthType.BASIC}>Basic Auth</option>
                      </select>
                    </div>

                    {authType !== AuthType.NONE && (
                      <div className="p-4 bg-blue-50 rounded-lg border border-blue-100">
                        <Input
                          label={
                            authType === AuthType.APIKEY
                              ? "Clé API"
                              : "Token / Identifiants"
                          }
                          placeholder="••••••••"
                          type="password"
                          value={formData.authCredentials}
                          onChange={(e) =>
                            handleInputChange("authCredentials", e.target.value)
                          }
                        />
                      </div>
                    )}
                  </div>
                )}

                {activeTab === DocMode.MANUAL && (
                  <div className="space-y-6">
                    <Input
                      label="Nom du service"
                      placeholder="Mon API manuelle"
                      required
                      value={formData.name}
                      onChange={(e) =>
                        handleInputChange("name", e.target.value)
                      }
                    />

                    <Input
                      label="Description du service"
                      placeholder="ex: This service manages user accounts and authentication."
                      required
                      value={formData.description}
                      onChange={(e) =>
                        handleInputChange("description", e.target.value)
                      }
                    />

                    <Input
                      label="URL de base du service"
                      placeholder="http://api.example.com/v1"
                      required
                      value={formData.projectUrl}
                      onChange={(e) =>
                        handleInputChange("projectUrl", e.target.value)
                      }
                      onBlur={(e) => isValidServiceUrl(e.target.value, false)}
                      error={!validServiceUrl ? "URL invalide" : undefined}
                    />

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Authentification
                      </label>
                      <select
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary outline-none"
                        value={authType}
                        onChange={(e) =>
                          setAuthType(e.target.value as AuthType)
                        }
                      >
                        <option value={AuthType.NONE}>Aucune</option>
                        <option value={AuthType.APIKEY}>API Key</option>
                        <option value={AuthType.BEARER}>Bearer Token</option>
                        <option value={AuthType.BASIC}>Basic Auth</option>
                      </select>
                    </div>

                    <div className="space-y-4">
                      <p className="text-sm font-bold text-gray-400 uppercase tracking-wider">
                        Endpoints
                      </p>
                      {manualEndpoints.map((ep, idx) => (
                        <div
                          key={idx}
                          className="flex gap-4 items-end bg-gray-50 p-4 rounded-xl relative"
                        >
                          <div className="w-32">
                            <label className="block text-xs font-bold text-gray-400 mb-1 uppercase">
                              Méthode
                            </label>
                            <select className="w-full px-3 py-2 border rounded-lg bg-white">
                              <option>GET</option>
                              <option>POST</option>
                              <option>PUT</option>
                              <option>DELETE</option>
                            </select>
                          </div>
                          <div className="flex-1">
                            <label className="block text-xs font-bold text-gray-400 mb-1 uppercase">
                              Chemin (Path)
                            </label>
                            <Input placeholder="/users" className="mb-0" />
                          </div>
                          <Button
                            variant="ghost"
                            className="text-red-400 hover:text-red-600 p-2"
                            onClick={() => removeManualEndpoint(idx)}
                            type="button"
                          >
                            <TrashIcon className="w-5 h-5" />
                          </Button>
                        </div>
                      ))}
                      <Button
                        variant="outline"
                        className="w-full border-dashed"
                        type="button"
                        onClick={addManualEndpoint}
                        icon={<PlusIcon className="w-4 h-4" />}
                      >
                        Ajouter un endpoint
                      </Button>
                    </div>
                  </div>
                )}

                <div className="flex gap-4 mt-12 pt-8 border-t border-gray-100">
                  <Button
                    variant="outline"
                    type="button"
                    onClick={() => navigate("/dashboard")}
                    disabled={loading}
                  >
                    Annuler
                  </Button>
                  <Button
                    type="submit"
                    className="flex-1"
                    loading={loading}
                    icon={!loading && <ArrowPathIcon className="w-5 h-5" />}
                  >
                    {activeTab === DocMode.SWAGGER
                      ? "Analyser et Générer Tests"
                      : "Créer le Service"}
                  </Button>
                </div>
              </form>
            </div>
          </Card>

          {loading && (
            <div className="text-center p-8">
              <p className="text-lg font-bold text-primary animate-pulse">
                {activeTab === DocMode.SWAGGER
                  ? "L'IA analyse vos endpoints..."
                  : "Création du service en cours..."}
              </p>
              <p className="text-gray-500 text-sm mt-2 italic">
                {activeTab === DocMode.SWAGGER
                  ? "Analyse des structures JSON, détection des contraintes, génération des scénarios limites..."
                  : "Configuration de votre service..."}
              </p>
            </div>
          )}
        </main>
      </div>
    </div>
  );
};

const TabButton: React.FC<{
  active: boolean;
  children: React.ReactNode;
  onClick: () => void;
  icon: React.ReactNode;
}> = ({ active, children, onClick, icon }) => (
  <button
    className={`flex-1 flex items-center justify-center gap-2 py-4 px-6 font-semibold transition-all duration-200 border-b-2 
      ${active ? "border-primary bg-white text-primary" : "border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-100"}`}
    onClick={onClick}
    type="button"
  >
    {icon}
    {children}
  </button>
);

export default AddServicePage;
