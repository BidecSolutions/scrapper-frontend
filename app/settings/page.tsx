"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/Input";
import { FormCard } from "@/components/ui/FormCard";
import { PageHeader } from "@/components/ui/PageHeader";
import { MetricCard } from "@/components/ui/metrics";
import { apiClient } from "@/lib/api";
import { useToast } from "@/components/ui/Toast";
import { useOrganization } from "@/contexts/OrganizationContext";
import { Copy, Trash2, Plus, X, Upload, Image as ImageIcon, Key, Building2, BarChart3, Loader2 } from "lucide-react";
import { CopyButton } from "@/components/ui/CopyButton";

interface Organization {
  id: number;
  name: string;
  slug: string;
  plan_tier: string;
  logo_url?: string | null;
  brand_name?: string | null;
  tagline?: string | null;
  created_at: string;
}

interface ApiKey {
  id: number;
  name: string | null;
  key_prefix: string;
  status: string;
  last_used_at: string | null;
  created_at: string;
}

interface UsageStats {
  plan_tier: string;
  leads_used_this_month: number;
  leads_limit_per_month: number;
  total_leads: number;
  total_jobs: number;
}

export default function SettingsPage() {
  const { showToast } = useToast();
  const { organization: orgFromContext, refreshOrganization } = useOrganization();
  const [organization, setOrganization] = useState<Organization | null>(null);
  const [orgName, setOrgName] = useState("");
  const [brandName, setBrandName] = useState("");
  const [tagline, setTagline] = useState("");
  const [savingOrg, setSavingOrg] = useState(false);
  const [apiKeys, setApiKeys] = useState<ApiKey[]>([]);
  const [loadingKeys, setLoadingKeys] = useState(true);
  const [usageStats, setUsageStats] = useState<UsageStats | null>(null);
  const [loadingUsage, setLoadingUsage] = useState(true);
  const [showCreateKey, setShowCreateKey] = useState(false);
  const [newKeyName, setNewKeyName] = useState("");
  const [creatingKey, setCreatingKey] = useState(false);
  const [newKeyValue, setNewKeyValue] = useState<string | null>(null);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);

  useEffect(() => {
    loadOrganization();
    loadApiKeys();
    loadUsageStats();
  }, []);

  useEffect(() => {
    if (organization?.logo_url) {
      const logoUrl = organization.logo_url.startsWith("http") 
        ? organization.logo_url 
        : `${process.env.NEXT_PUBLIC_API_URL || "http://localhost:8002"}${organization.logo_url}`;
      setLogoPreview(logoUrl);
    } else {
      setLogoPreview(null);
    }
  }, [organization?.logo_url]);

  useEffect(() => {
    if (orgFromContext) {
      setOrganization(orgFromContext);
      setOrgName(orgFromContext.name);
      setBrandName(orgFromContext.brand_name || "");
      setTagline(orgFromContext.tagline || "");
    }
  }, [orgFromContext]);

  const loadOrganization = async () => {
    try {
      if (orgFromContext) {
        setOrganization(orgFromContext);
        setOrgName(orgFromContext.name);
        setBrandName(orgFromContext.brand_name || "");
        setTagline(orgFromContext.tagline || "");
      } else {
        const org = await apiClient.getOrganization();
        setOrganization(org);
        setOrgName(org.name);
        setBrandName(org.brand_name || "");
        setTagline(org.tagline || "");
      }
    } catch (error) {
      console.error("Failed to load organization:", error);
      showToast({
        type: "error",
        title: "Failed to load organization",
        message: "Please try again later",
      });
    }
  };

  const saveOrganization = async () => {
    if (!orgName.trim()) {
      showToast({
        type: "error",
        title: "Invalid name",
        message: "Organization name cannot be empty",
      });
      return;
    }

    setSavingOrg(true);
    try {
      const updated = await apiClient.updateOrganization(
        orgName.trim(),
        brandName.trim() || null,
        tagline.trim() || null
      );
      setOrganization(updated);
      setBrandName(updated.brand_name || "");
      setTagline(updated.tagline || "");
      await refreshOrganization();
      showToast({
        type: "success",
        title: "Organization updated",
        message: "Your organization settings have been saved",
      });
    } catch (error: any) {
      console.error("Failed to update organization:", error);
      showToast({
        type: "error",
        title: "Failed to update",
        message: error?.response?.data?.detail || "Please try again later",
      });
    } finally {
      setSavingOrg(false);
    }
  };

  const loadApiKeys = async () => {
    setLoadingKeys(true);
    try {
      const keys = await apiClient.getApiKeys();
      setApiKeys(keys);
    } catch (error) {
      console.error("Failed to load API keys:", error);
      showToast({
        type: "error",
        title: "Failed to load API keys",
        message: "Please try again later",
      });
    } finally {
      setLoadingKeys(false);
    }
  };

  const createApiKey = async () => {
    setCreatingKey(true);
    try {
      const newKey = await apiClient.createApiKey(newKeyName.trim() || undefined);
      setNewKeyValue(newKey.key);
      setNewKeyName("");
      await loadApiKeys();
      showToast({
        type: "success",
        title: "API key created",
        message: "Make sure to copy it now - you won't be able to see it again!",
      });
    } catch (error: any) {
      console.error("Failed to create API key:", error);
      showToast({
        type: "error",
        title: "Failed to create API key",
        message: error?.response?.data?.detail || "Please try again later",
      });
    } finally {
      setCreatingKey(false);
    }
  };

  const revokeApiKey = async (keyId: number) => {
    if (!confirm("Are you sure you want to revoke this API key? This action cannot be undone.")) {
      return;
    }

    try {
      await apiClient.revokeApiKey(keyId);
      await loadApiKeys();
      showToast({
        type: "success",
        title: "API key revoked",
        message: "The API key has been successfully revoked",
      });
    } catch (error: any) {
      console.error("Failed to revoke API key:", error);
      showToast({
        type: "error",
        title: "Failed to revoke",
        message: error?.response?.data?.detail || "Please try again later",
      });
    }
  };

  const loadUsageStats = async () => {
    setLoadingUsage(true);
    try {
      const stats = await apiClient.getUsageStats();
      setUsageStats(stats);
    } catch (error) {
      console.error("Failed to load usage stats:", error);
      showToast({
        type: "error",
        title: "Failed to load usage",
        message: "Please try again later",
      });
    } finally {
      setLoadingUsage(false);
    }
  };

  const formatNumber = (num: number) => {
    return new Intl.NumberFormat().format(num);
  };

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const allowedTypes = ["image/png", "image/jpeg", "image/jpg", "image/gif", "image/svg+xml", "image/webp"];
    if (!allowedTypes.includes(file.type)) {
      showToast({
        type: "error",
        title: "Invalid file type",
        message: "Please upload a PNG, JPEG, GIF, SVG, or WebP image",
      });
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      showToast({
        type: "error",
        title: "File too large",
        message: "Maximum file size is 5MB",
      });
      return;
    }

    setUploadingLogo(true);
    try {
      const updated = await apiClient.uploadLogo(file);
      setOrganization(updated);
      await refreshOrganization();
      showToast({
        type: "success",
        title: "Logo uploaded",
        message: "Your organization logo has been updated",
      });
    } catch (error: any) {
      console.error("Failed to upload logo:", error);
      showToast({
        type: "error",
        title: "Upload failed",
        message: error?.response?.data?.detail || "Failed to upload logo. Please try again.",
      });
    } finally {
      setUploadingLogo(false);
      e.target.value = "";
    }
  };

  const handleDeleteLogo = async () => {
    if (!confirm("Are you sure you want to remove the logo? This action cannot be undone.")) {
      return;
    }

    try {
      const updated = await apiClient.deleteLogo();
      setOrganization(updated);
      await refreshOrganization();
      showToast({
        type: "success",
        title: "Logo removed",
        message: "Your organization logo has been removed",
      });
    } catch (error: any) {
      console.error("Failed to delete logo:", error);
      showToast({
        type: "error",
        title: "Delete failed",
        message: error?.response?.data?.detail || "Failed to remove logo. Please try again.",
      });
    }
  };

  const hasChanges = organization && (
    orgName !== organization.name ||
    brandName !== (organization.brand_name || "") ||
    tagline !== (organization.tagline || "")
  );

  return (
    <div className="flex-1 flex flex-col overflow-hidden bg-gradient-to-br from-slate-50 via-white to-slate-50 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950">
      <PageHeader
        title="Settings"
        description="Manage your organization settings, API keys, and usage"
        icon={Building2}
      />

      <main className="flex-1 overflow-y-auto scroll-smooth custom-scrollbar px-6 pt-6 pb-12">
        <div className="max-w-5xl mx-auto space-y-6">
          {/* Usage Stats */}
          {usageStats && (
            <motion.section
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="grid grid-cols-1 sm:grid-cols-4 gap-4"
            >
              <MetricCard label="Current Plan" value={usageStats.plan_tier.toUpperCase()} icon={BarChart3} />
              <MetricCard
                label="Leads This Month"
                value={`${formatNumber(usageStats.leads_used_this_month)} / ${formatNumber(usageStats.leads_limit_per_month)}`}
                tone="info"
              />
              <MetricCard label="Total Leads" value={formatNumber(usageStats.total_leads)} />
              <MetricCard label="Total Jobs" value={formatNumber(usageStats.total_jobs)} />
            </motion.section>
          )}

          {/* Organization Settings */}
          <FormCard
            title="Organization"
            description="Manage your organization details and branding"
            icon={Building2}
            delay={0.1}
          >
            <div className="space-y-6">
              {/* Logo Upload */}
              <div className="space-y-3">
                <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300">
                  Organization Logo
                </label>
                <div className="flex items-center gap-4">
                  <div className="relative">
                    {logoPreview ? (
                      <div className="relative group">
                        <img
                          src={logoPreview}
                          alt="Organization logo"
                          className="h-20 w-20 rounded-xl object-cover border-2 border-slate-200 dark:border-slate-700 shadow-lg"
                        />
                        <motion.button
                          whileHover={{ scale: 1.1 }}
                          whileTap={{ scale: 0.9 }}
                          onClick={handleDeleteLogo}
                          className="absolute -top-2 -right-2 p-1.5 rounded-full bg-rose-500 hover:bg-rose-600 text-white opacity-0 group-hover:opacity-100 transition-opacity shadow-lg"
                          title="Remove logo"
                        >
                          <X className="w-3.5 h-3.5" />
                        </motion.button>
                      </div>
                    ) : (
                      <div className="h-20 w-20 rounded-xl border-2 border-dashed border-slate-300 dark:border-slate-700 flex items-center justify-center bg-slate-100 dark:bg-slate-900">
                        <ImageIcon className="w-8 h-8 text-slate-400" />
                      </div>
                    )}
                  </div>
                  <div className="flex-1">
                    <input
                      id="logo-upload-input"
                      type="file"
                      accept="image/png,image/jpeg,image/jpg,image/gif,image/svg+xml,image/webp"
                      onChange={handleLogoUpload}
                      disabled={uploadingLogo}
                      className="hidden"
                    />
                    <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                      <Button
                        type="button"
                        variant="outline"
                        disabled={uploadingLogo}
                        onClick={() => document.getElementById('logo-upload-input')?.click()}
                        className="w-full sm:w-auto"
                      >
                        <Upload className="w-4 h-4 mr-2" />
                        {uploadingLogo ? "Uploading..." : logoPreview ? "Change Logo" : "Upload Logo"}
                      </Button>
                    </motion.div>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-1.5">
                      PNG, JPEG, GIF, SVG, or WebP. Max 5MB
                    </p>
                  </div>
                </div>
              </div>

              <Input
                label="Organization Name"
                required
                value={orgName}
                onChange={(e) => setOrgName(e.target.value)}
                placeholder="Enter organization name"
              />

              <Input
                label="Brand Name"
                value={brandName}
                onChange={(e) => setBrandName(e.target.value)}
                placeholder="LeadFlux AI"
                helperText="Display name shown in sidebar (e.g., 'LeadFlux AI')"
              />

              <Input
                label="Tagline"
                value={tagline}
                onChange={(e) => setTagline(e.target.value)}
                placeholder="Scrape • Enrich • Score"
                helperText="Short description shown below brand name"
              />

              <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                <Button
                  onClick={saveOrganization}
                  disabled={savingOrg || !hasChanges}
                  className="w-full bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-400 hover:to-blue-400 text-white shadow-lg"
                >
                  {savingOrg ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    "Save Changes"
                  )}
                </Button>
              </motion.div>
            </div>
          </FormCard>

          {/* API Keys */}
          <FormCard
            title="API Keys"
            description="Create keys for programmatic access to scraping and enrichment APIs"
            icon={Key}
            delay={0.2}
          >
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm text-slate-600 dark:text-slate-400">
                  {apiKeys.length} key{apiKeys.length !== 1 ? "s" : ""} configured
                </span>
                <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setShowCreateKey(true)}
                    className="flex items-center gap-2"
                  >
                    <Plus className="w-4 h-4" />
                    Create Key
                  </Button>
                </motion.div>
              </div>

              {/* Create API Key Modal */}
              <AnimatePresence>
                {showCreateKey && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    className="p-4 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/30 space-y-4"
                  >
                    <div className="flex items-center justify-between">
                      <h3 className="text-sm font-bold text-slate-900 dark:text-slate-50">Create New API Key</h3>
                      <motion.button
                        whileHover={{ scale: 1.1, rotate: 90 }}
                        whileTap={{ scale: 0.9 }}
                        onClick={() => {
                          setShowCreateKey(false);
                          setNewKeyName("");
                          setNewKeyValue(null);
                        }}
                        className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                      >
                        <X className="w-4 h-4" />
                      </motion.button>
                    </div>
                    {newKeyValue ? (
                      <div className="space-y-3">
                        <div className="p-4 rounded-xl bg-gradient-to-r from-emerald-50 to-green-50 dark:from-emerald-950/30 dark:to-green-950/30 border border-emerald-200 dark:border-emerald-800">
                          <p className="text-xs text-emerald-700 dark:text-emerald-300 font-semibold mb-3 flex items-center gap-2">
                            <X className="w-4 h-4" />
                            Make sure to copy this key now. You won't be able to see it again!
                          </p>
                          <div className="flex items-center gap-2">
                            <code className="flex-1 px-4 py-3 rounded-lg bg-slate-900 dark:bg-slate-950 text-emerald-400 text-sm font-mono break-all border border-slate-800">
                              {newKeyValue}
                            </code>
                            <CopyButton textToCopy={newKeyValue} />
                          </div>
                        </div>
                        <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                          <Button
                            onClick={() => {
                              setShowCreateKey(false);
                              setNewKeyValue(null);
                              setNewKeyName("");
                            }}
                            className="w-full"
                          >
                            Done
                          </Button>
                        </motion.div>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        <Input
                          label="Key Name (Optional)"
                          value={newKeyName}
                          onChange={(e) => setNewKeyName(e.target.value)}
                          placeholder="My API Key"
                        />
                        <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                          <Button
                            onClick={createApiKey}
                            disabled={creatingKey}
                            className="w-full bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-400 hover:to-blue-400 text-white shadow-lg"
                          >
                            {creatingKey ? (
                              <>
                                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                Creating...
                              </>
                            ) : (
                              <>
                                <Plus className="w-4 h-4 mr-2" />
                                Create API Key
                              </>
                            )}
                          </Button>
                        </motion.div>
                      </div>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>

              {/* API Keys List */}
              {loadingKeys ? (
                <div className="text-center py-8">
                  <Loader2 className="w-6 h-6 animate-spin text-cyan-400 mx-auto mb-2" />
                  <p className="text-sm text-slate-500 dark:text-slate-400">Loading API keys...</p>
                </div>
              ) : apiKeys.length === 0 ? (
                <div className="text-center py-8 text-slate-500 dark:text-slate-400">
                  <Key className="w-12 h-12 mx-auto mb-3 opacity-50" />
                  <p className="text-sm">No API keys yet. Create one to get started.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {apiKeys.map((key, index) => (
                    <motion.div
                      key={key.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.05 }}
                      className="flex items-center justify-between p-4 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-900/30 hover:bg-slate-100/50 dark:hover:bg-slate-900/50 transition-colors"
                    >
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-sm font-semibold text-slate-900 dark:text-slate-50">
                            {key.name || "Unnamed Key"}
                          </span>
                          {key.status === "active" ? (
                            <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30">
                              Active
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/30">
                              Revoked
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-3 text-xs text-slate-500 dark:text-slate-400">
                          <code className="font-mono">{key.key_prefix}...</code>
                          {key.last_used_at && (
                            <span>• Last used: {new Date(key.last_used_at).toLocaleDateString()}</span>
                          )}
                        </div>
                      </div>
                      {key.status === "active" && (
                        <motion.button
                          whileHover={{ scale: 1.1 }}
                          whileTap={{ scale: 0.9 }}
                          onClick={() => revokeApiKey(key.id)}
                          className="p-2 rounded-lg text-rose-600 dark:text-rose-400 hover:bg-rose-100 dark:hover:bg-rose-900/30 transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </motion.button>
                      )}
                    </motion.div>
                  ))}
                </div>
              )}
            </div>
          </FormCard>

          {/* Plan & Usage */}
          {usageStats && (
            <FormCard
              title="Plan & Usage"
              description="Monitor your current plan and usage statistics"
              icon={BarChart3}
              delay={0.3}
            >
              <div className="space-y-6">
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="p-4 rounded-xl bg-slate-100 dark:bg-slate-900/30 border border-slate-200 dark:border-slate-700">
                    <div className="text-xs text-slate-500 dark:text-slate-400 mb-1">Current Plan</div>
                    <div className="text-lg font-bold text-slate-900 dark:text-slate-50 uppercase">
                      {usageStats.plan_tier}
                    </div>
                  </div>
                  <div className="p-4 rounded-xl bg-slate-100 dark:bg-slate-900/30 border border-slate-200 dark:border-slate-700">
                    <div className="text-xs text-slate-500 dark:text-slate-400 mb-1">Leads Used (This Month)</div>
                    <div className="text-lg font-bold text-slate-900 dark:text-slate-50">
                      {formatNumber(usageStats.leads_used_this_month)} / {formatNumber(usageStats.leads_limit_per_month)}
                    </div>
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between text-xs mb-2">
                    <span className="text-slate-600 dark:text-slate-400">Monthly Usage</span>
                    <span className="text-slate-900 dark:text-slate-50 font-semibold">
                      {Math.round((usageStats.leads_used_this_month / usageStats.leads_limit_per_month) * 100)}%
                    </span>
                  </div>
                  <div className="h-3 rounded-full bg-slate-200 dark:bg-slate-800 overflow-hidden">
                    <motion.div
                      className="h-full bg-gradient-to-r from-cyan-500 to-emerald-500"
                      initial={{ width: 0 }}
                      animate={{
                        width: `${Math.min(100, (usageStats.leads_used_this_month / usageStats.leads_limit_per_month) * 100)}%`,
                      }}
                      transition={{ duration: 0.8, ease: "easeOut" }}
                    />
                  </div>
                </div>

                <div className="grid gap-4 md:grid-cols-2 pt-4 border-t border-slate-200 dark:border-slate-800">
                  <div>
                    <div className="text-xs text-slate-500 dark:text-slate-400 mb-1">Total Leads</div>
                    <div className="text-xl font-bold text-slate-900 dark:text-slate-50">
                      {formatNumber(usageStats.total_leads)}
                    </div>
                  </div>
                  <div>
                    <div className="text-xs text-slate-500 dark:text-slate-400 mb-1">Total Jobs</div>
                    <div className="text-xl font-bold text-slate-900 dark:text-slate-50">
                      {formatNumber(usageStats.total_jobs)}
                    </div>
                  </div>
                </div>
              </div>
            </FormCard>
          )}
        </div>
      </main>
    </div>
  );
}
