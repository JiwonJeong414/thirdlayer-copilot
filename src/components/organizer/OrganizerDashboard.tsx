import React, { useState, useEffect } from 'react';
import { 
  FolderPlus, 
  Brain, 
  Zap, 
  FileText, 
  Folder, 
  Users, 
  Calendar, 
  Image, 
  Archive,
  BarChart3,
  Settings,
  Play,
  Pause,
  CheckCircle,
  AlertTriangle,
  Clock,
  Sparkles,
  ArrowRight,
  TrendingUp,
  Target
} from 'lucide-react';

interface FileCluster {
  id: string;
  name: string;
  description: string;
  color: string;
  files: Array<{
    fileId: string;
    fileName: string;
    confidence: number;
    keywords: string[];
  }>;
  suggestedFolderName: string;
  category: 'work' | 'personal' | 'media' | 'documents' | 'archive' | 'mixed';
}

interface OrganizationSuggestion {
  clusters: FileCluster[];
  summary: {
    totalFiles: number;
    clustersCreated: number;
    estimatedSavings: number;
    confidence: number;
  };
  actions: {
    createFolders: boolean;
    moveFiles: boolean;
    addLabels: boolean;
  };
}

export default function DriveOrganizerDashboard({ onBack }: { onBack: () => void }) {
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isOrganizing, setIsOrganizing] = useState(false);
  const [suggestion, setSuggestion] = useState<OrganizationSuggestion | null>(null);
  const [selectedMethod, setSelectedMethod] = useState<'folders' | 'clustering' | 'hybrid'>('hybrid');
  const [maxClusters, setMaxClusters] = useState(6);
  const [minClusterSize, setMinClusterSize] = useState(3);
  const [createFolders, setCreateFolders] = useState(false);
  const [selectedClusters, setSelectedClusters] = useState<Set<string>>(new Set());

  const getCategoryIcon = (category: FileCluster['category']) => {
    switch (category) {
      case 'work': return <Users className="w-5 h-5" />;
      case 'personal': return <Calendar className="w-5 h-5" />;
      case 'media': return <Image className="w-5 h-5" />;
      case 'documents': return <FileText className="w-5 h-5" />;
      case 'archive': return <Archive className="w-5 h-5" />;
      default: return <Folder className="w-5 h-5" />;
    }
  };

  const runAnalysis = async () => {
    setIsAnalyzing(true);
    try {
      console.log('🎯 Starting organization analysis...');
      
      const response = await fetch('/api/organize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          method: selectedMethod,
          maxClusters,
          minClusterSize,
          createFolders: false, // Always dry run first
          dryRun: true
        }),
      });
      
      if (!response.ok) {
        throw new Error('Organization analysis failed');
      }
      
      const result = await response.json();
      setSuggestion(result);
      setSelectedClusters(new Set(result.clusters.map((c: FileCluster) => c.id)));
      
    } catch (error) {
      console.error('Analysis failed:', error);
      alert('Failed to analyze files for organization');
    } finally {
      setIsAnalyzing(false);
    }
  };

  const executeOrganization = async () => {
    if (!suggestion) return;
    
    // FIXED: Properly filter clusters based on user selection
    const selectedClusterIds = Array.from(selectedClusters);
    const selectedClusterData = suggestion.clusters.filter(c => selectedClusterIds.includes(c.id));
    
    if (selectedClusterData.length === 0) {
      alert('Please select at least one cluster to organize');
      return;
    }

    console.log('🎯 Selected clusters for execution:', selectedClusterData.map(c => ({ id: c.id, name: c.name })));

    const confirmed = confirm(
      `🚀 Create ${selectedClusterData.length} folders and organize ${
        selectedClusterData.reduce((sum, c) => sum + c.files.length, 0)
      } files?\n\nThis will:\n• Create new folders in Google Drive\n• Move files to appropriate folders\n• This action cannot be undone`
    );

    if (!confirmed) return;

    setIsOrganizing(true);
    try {
      // FIXED: Send both IDs and names for better matching
      const response = await fetch('/api/organize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          method: selectedMethod,
          maxClusters,
          minClusterSize,
          createFolders: true,
          dryRun: false,
          selectedClusters: selectedClusterIds, // Send the selected cluster IDs
          selectedClusterNames: selectedClusterData.map(c => c.name), // Also send names for fallback matching
          selectedClusterInfo: selectedClusterData.map(c => ({ // Send full info for debugging
            id: c.id,
            name: c.name,
            fileCount: c.files.length,
            category: c.category,
            files: c.files.map(f => ({
              fileId: f.fileId,
              fileName: f.fileName,
              confidence: f.confidence,
              keywords: f.keywords
            }))
          }))
        }),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Organization execution failed');
      }
      
      const result = await response.json();
      
      alert(`🎉 Organization completed successfully! 
      
Processed ${result.summary?.totalFiles || selectedClusterData.reduce((sum, c) => sum + c.files.length, 0)} files across ${selectedClusterData.length} folders.

Check your Google Drive for the new folder structure.`);
      
      setSuggestion(null);
      setSelectedClusters(new Set());
      
    } catch (error) {
      console.error('Organization failed:', error);
      alert(`Failed to organize files: ${error instanceof Error ? error.message : 'Unknown error'}. Please try again.`);
    } finally {
      setIsOrganizing(false);
    }
  };

  const toggleCluster = (clusterId: string) => {
    setSelectedClusters(prev => {
      const next = new Set(prev);
      if (next.has(clusterId)) {
        next.delete(clusterId);
      } else {
        next.add(clusterId);
      }
      console.log('🔄 Updated cluster selection:', Array.from(next));
      return next;
    });
  };

  const toggleAllClusters = () => {
    if (!suggestion) return;
    
    if (selectedClusters.size === suggestion.clusters.length) {
      setSelectedClusters(new Set());
      console.log('🔄 Deselected all clusters');
    } else {
      setSelectedClusters(new Set(suggestion.clusters.map(c => c.id)));
      console.log('🔄 Selected all clusters:', suggestion.clusters.map(c => c.name));
    }
  };

  return (
      <div className="relative">
        <div className="max-w-7xl mx-auto p-6">

        {/* Configuration Panel */}
        {!suggestion && (
          <div className="bg-gray-800/50 backdrop-blur-sm border border-gray-700 rounded-xl p-6 mb-8">
            <h3 className="text-xl font-bold text-white mb-6 flex items-center space-x-2">
              <Settings className="w-5 h-5" />
              <span>Organization Settings</span>
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Method Selection */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-3">
                  Organization Method
                </label>
                <div className="space-y-2">
                  {[
                    { value: 'clustering', label: 'AI Clustering', desc: 'Content-based grouping' },
                    { value: 'folders', label: 'Folder Structure', desc: 'Existing folder patterns' },
                    { value: 'hybrid', label: 'Hybrid (Recommended)', desc: 'Combined approach' }
                  ].map(method => (
                    <label key={method.value} className="flex items-center space-x-3 cursor-pointer">
                      <input
                        type="radio"
                        value={method.value}
                        checked={selectedMethod === method.value}
                        onChange={(e) => setSelectedMethod(e.target.value as any)}
                        className="text-green-500 bg-gray-700 border-gray-600"
                      />
                      <div>
                        <div className="text-white font-medium">{method.label}</div>
                        <div className="text-sm text-gray-400">{method.desc}</div>
                      </div>
                    </label>
                  ))}
                </div>
              </div>

              {/* Cluster Settings */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-3">
                  Clustering Parameters
                </label>
                <div className="space-y-4">
                  <div>
                    <label className="block text-xs text-gray-400 mb-1">Max Clusters: {maxClusters}</label>
                    <input
                      type="range"
                      min="3"
                      max="12"
                      value={maxClusters}
                      onChange={(e) => setMaxClusters(parseInt(e.target.value))}
                      className="w-full accent-green-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-400 mb-1">Min Files per Cluster: {minClusterSize}</label>
                    <input
                      type="range"
                      min="2"
                      max="8"
                      value={minClusterSize}
                      onChange={(e) => setMinClusterSize(parseInt(e.target.value))}
                      className="w-full accent-green-500"
                    />
                  </div>
                </div>
              </div>

              {/* Options */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-3">
                  Organization Options
                </label>
                <div className="space-y-3">
                  <label className="flex items-center space-x-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={createFolders}
                      onChange={(e) => setCreateFolders(e.target.checked)}
                      className="text-green-500 bg-gray-700 border-gray-600"
                    />
                    <span className="text-sm text-gray-300">Create folders automatically</span>
                  </label>
                  <div className="bg-yellow-900/30 border border-yellow-700 rounded p-3">
                    <p className="text-xs text-yellow-300">
                      ⚠️ This will create new folders and move files in your Google Drive. 
                      Always review suggestions first.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Start Analysis Button */}
            <div className="flex justify-center mt-8">
              <button
                onClick={runAnalysis}
                disabled={isAnalyzing}
                className="flex items-center space-x-3 px-8 py-4 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 disabled:from-gray-600 disabled:to-gray-700 rounded-xl text-white font-medium transition-all transform hover:scale-105 disabled:scale-100"              >
                {isAnalyzing ? (
                  <>
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white" />
                    <span>Analyzing Files...</span>
                  </>
                ) : (
                  <>
                    <Brain className="w-5 h-5" />
                    <span>Analyze & Organize Files</span>
                  </>
                )}
              </button>
            </div>
          </div>
        )}

        {/* Results Dashboard */}
        {suggestion && (
          <div className="space-y-6">
            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="bg-gray-800/50 backdrop-blur-sm border border-gray-700 rounded-xl p-4">
                <div className="flex items-center space-x-3">
                  <FileText className="w-6 h-6 text-blue-400" />
                  <div>
                    <p className="text-sm text-gray-400">Files Analyzed</p>
                    <p className="text-2xl font-bold text-white">{suggestion.summary.totalFiles}</p>
                  </div>
                </div>
              </div>
              
              <div className="bg-gray-800/50 backdrop-blur-sm border border-gray-700 rounded-xl p-4">
                <div className="flex items-center space-x-3">
                  <Folder className="w-6 h-6 text-green-400" />
                  <div>
                    <p className="text-sm text-gray-400">Clusters Created</p>
                    <p className="text-2xl font-bold text-white">{suggestion.summary.clustersCreated}</p>
                  </div>
                </div>
              </div>
              
              <div className="bg-gray-800/50 backdrop-blur-sm border border-gray-700 rounded-xl p-4">
                <div className="flex items-center space-x-3">
                  <Clock className="w-6 h-6 text-green-400" />
                  <div>
                    <p className="text-sm text-gray-400">Est. Time Saved</p>
                    <p className="text-2xl font-bold text-white">{suggestion.summary.estimatedSavings}h</p>
                  </div>
                </div>
              </div>
              
              <div className="bg-gray-800/50 backdrop-blur-sm border border-gray-700 rounded-xl p-4">
                <div className="flex items-center space-x-3">
                  <Target className="w-6 h-6 text-orange-400" />
                  <div>
                    <p className="text-sm text-gray-400">Confidence</p>
                    <p className="text-2xl font-bold text-white">{Math.round(suggestion.summary.confidence * 100)}%</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Action Bar */}
            <div className="bg-gray-800/50 backdrop-blur-sm border border-gray-700 rounded-xl p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  <button
                    onClick={toggleAllClusters}
                    className="px-4 py-2 bg-gray-600 hover:bg-gray-700 rounded-lg transition-colors"
                  >
                    {selectedClusters.size === suggestion.clusters.length ? 'Deselect All' : 'Select All'}
                  </button>
                  
                  <span className="text-sm text-gray-400">
                    {selectedClusters.size} of {suggestion.clusters.length} clusters selected
                    {selectedClusters.size > 0 && (
                      <span className="ml-2 text-green-400">
                        ({suggestion.clusters
                          .filter(c => selectedClusters.has(c.id))
                          .reduce((sum, c) => sum + c.files.length, 0)} files)
                      </span>
                    )}
                  </span>
                </div>

                <div className="flex items-center space-x-3">
                  <button
                    onClick={() => setSuggestion(null)}
                    className="px-4 py-2 bg-gray-600 hover:bg-gray-700 rounded-lg transition-colors"
                  >
                    New Analysis
                  </button>
                  
                  <button
                    onClick={executeOrganization}
                    disabled={isOrganizing || selectedClusters.size === 0}
                    className="flex items-center space-x-2 px-6 py-2 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 disabled:from-gray-600 disabled:to-gray-700 rounded-lg transition-all"
                  >
                    {isOrganizing ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" />
                        <span>Organizing...</span>
                      </>
                    ) : (
                      <>
                        <FolderPlus className="w-4 h-4" />
                        <span>Execute Organization ({selectedClusters.size} clusters)</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>

            {/* Clusters Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {suggestion.clusters.map((cluster) => (
                <div
                  key={cluster.id}
                  className={`bg-gray-800/50 backdrop-blur-sm border rounded-xl p-6 transition-all cursor-pointer ${
                    selectedClusters.has(cluster.id)
                      ? 'border-green-500 ring-2 ring-green-500/50 bg-green-900/10'
                      : 'border-gray-700 hover:border-gray-600'
                  }`}
                  onClick={() => toggleCluster(cluster.id)}
                >
                  {/* Cluster Header */}
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center space-x-3">
                      <div 
                        className="p-2 rounded-lg"
                        style={{ backgroundColor: cluster.color + '20', color: cluster.color }}
                      >
                        {getCategoryIcon(cluster.category)}
                      </div>
                      <div>
                        <h3 className="font-bold text-white">{cluster.name}</h3>
                        <p className="text-sm text-gray-400 capitalize">{cluster.category}</p>
                      </div>
                    </div>
                    
                    <div className="flex items-center space-x-2">
                      {selectedClusters.has(cluster.id) && (
                        <CheckCircle className="w-5 h-5 text-green-400" />
                      )}
                      <input
                        type="checkbox"
                        checked={selectedClusters.has(cluster.id)}
                        onChange={() => toggleCluster(cluster.id)}
                        className="text-green-500 bg-gray-700 border-gray-600 w-5 h-5"
                        onClick={(e) => e.stopPropagation()}
                      />
                    </div>
                  </div>

                  {/* Description */}
                  <p className="text-sm text-gray-300 mb-4">{cluster.description}</p>

                  {/* Suggested Folder */}
                  <div className="bg-gray-700/50 rounded-lg p-3 mb-4">
                    <div className="flex items-center space-x-2">
                      <Folder className="w-4 h-4 text-blue-400" />
                      <span className="text-sm font-medium text-white">Suggested Folder:</span>
                    </div>
                    <p className="text-sm text-blue-300 mt-1">{cluster.suggestedFolderName}</p>
                  </div>

                  {/* Files Count & Confidence */}
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-400">
                      {cluster.files.length} files
                    </span>
                    <div className="flex items-center space-x-2">
                      <div className="flex -space-x-1">
                        {cluster.files.slice(0, 3).map((file, idx) => (
                          <div
                            key={idx}
                            className="w-6 h-6 bg-gray-600 rounded-full border-2 border-gray-800 flex items-center justify-center"
                            title={file.fileName}
                          >
                            <FileText className="w-3 h-3 text-gray-300" />
                          </div>
                        ))}
                        {cluster.files.length > 3 && (
                          <div className="w-6 h-6 bg-gray-500 rounded-full border-2 border-gray-800 flex items-center justify-center text-xs text-white">
                            +{cluster.files.length - 3}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Average Confidence */}
                  <div className="mt-3">
                    <div className="flex items-center justify-between text-xs text-gray-400 mb-1">
                      <span>Confidence</span>
                      <span>{Math.round((cluster.files.reduce((sum, f) => sum + f.confidence, 0) / cluster.files.length) * 100)}%</span>
                    </div>
                    <div className="w-full bg-gray-700 rounded-full h-1">
                      <div 
                        className="h-1 rounded-full bg-gradient-to-r from-red-500 via-yellow-500 to-green-500"
                        style={{ 
                          width: `${(cluster.files.reduce((sum, f) => sum + f.confidence, 0) / cluster.files.length) * 100}%` 
                        }}
                      />
                    </div>
                  </div>

                  {/* File Preview */}
                  <div className="mt-4 pt-4 border-t border-gray-700">
                    <p className="text-xs text-gray-400 mb-2">Sample Files:</p>
                    <div className="space-y-1">
                      {cluster.files.slice(0, 3).map((file, idx) => (
                        <div key={idx} className="flex items-center space-x-2">
                          <FileText className="w-3 h-3 text-gray-500" />
                          <span className="text-xs text-gray-300 truncate">{file.fileName}</span>
                        </div>
                      ))}
                      {cluster.files.length > 3 && (
                        <p className="text-xs text-gray-500">...and {cluster.files.length - 3} more</p>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Progress Indicator */}
            {isOrganizing && (
              <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
                <div className="bg-gray-800 rounded-xl p-8 max-w-md w-full mx-4">
                  <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-500 mx-auto mb-4" />
                    <h3 className="text-lg font-bold text-white mb-2">Organizing Your Drive</h3>
                    <p className="text-gray-400">
                      Creating {selectedClusters.size} folders and organizing{' '}
                      {suggestion.clusters
                        .filter(c => selectedClusters.has(c.id))
                        .reduce((sum, c) => sum + c.files.length, 0)}{' '}
                      files...
                    </p>
                    <div className="mt-4 text-sm text-gray-500">
                      This may take a few moments...
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Info Panel */}
        <div className="bg-gray-800/30 backdrop-blur-sm border border-gray-700 rounded-xl p-6 mt-8">
          <h3 className="text-lg font-medium text-white mb-3 flex items-center space-x-2">
            <Sparkles className="w-5 h-5 text-green-400" />
            <span>How It Works</span>
          </h3>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-sm">
            <div className="flex items-start space-x-3">
              <div className="w-8 h-8 bg-green-600 rounded-full flex items-center justify-center text-white font-bold">1</div>
              <div>
                <h4 className="font-medium text-white mb-1">AI Analysis</h4>
                <p className="text-gray-400">
                  Uses K-means clustering and content analysis to group similar files together based on their content and metadata.
                </p>
              </div>
            </div>
            
            <div className="flex items-start space-x-3">
              <div className="w-8 h-8 bg-green-600 rounded-full flex items-center justify-center text-white font-bold">2</div>
              <div>
                <h4 className="font-medium text-white mb-1">Smart Grouping</h4>
                <p className="text-gray-400">
                  Creates intelligent clusters based on content similarity, file types, and existing folder structures for optimal organization.
                </p>
              </div>
            </div>
            
            <div className="flex items-start space-x-3">
              <div className="w-8 h-8 bg-green-600 rounded-full flex items-center justify-center text-white font-bold">3</div>
              <div>
                <h4 className="font-medium text-white mb-1">Auto Organization</h4>
                <p className="text-gray-400">
                  Creates new folders in your Google Drive and moves files to appropriate locations based on the AI recommendations.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}