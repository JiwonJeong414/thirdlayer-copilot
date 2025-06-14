'use client';

import React, { useState, useEffect } from 'react';
import { 
  ArrowLeft,
  Trash2,
  Check,
  FileText,
  Clock,
  HardDrive,
  AlertTriangle,
  Loader2,
  Sparkles,
  Brain,
  XCircle,
  Copy,
  Target
} from 'lucide-react';
import { CleanableFile } from '@/lib/driveCleaner';

interface BatchCleanerUIProps {
  onBack: () => void;
}

interface CategoryStats {
  count: number;
  totalSize: number;
  files: CleanableFile[];
}

export default function BatchCleanerUI({ onBack }: BatchCleanerUIProps) {
  const [categories, setCategories] = useState<Record<string, CategoryStats>>({});
  const [selectedFiles, setSelectedFiles] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [deleteProgress, setDeleteProgress] = useState(0);

  useEffect(() => {
    loadSuggestions();
  }, []);

  const loadSuggestions = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/drive/cleaner/batch-suggest', {
        method: 'POST',
      });
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to load suggestions');
      }

      setCategories(data.categories);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load suggestions');
    } finally {
      setLoading(false);
    }
  };

  const toggleFileSelection = (fileId: string) => {
    setSelectedFiles(prev => {
      const next = new Set(prev);
      if (next.has(fileId)) {
        next.delete(fileId);
      } else {
        next.add(fileId);
      }
      return next;
    });
  };

  const toggleCategorySelection = (category: string) => {
    const categoryFiles = categories[category].files;
    const allSelected = categoryFiles.every(file => selectedFiles.has(file.id!));
    
    setSelectedFiles(prev => {
      const next = new Set(prev);
      categoryFiles.forEach(file => {
        if (allSelected) {
          next.delete(file.id!);
        } else {
          next.add(file.id!);
        }
      });
      return next;
    });
  };

  const handleDelete = async () => {
    if (!confirm(`Are you sure you want to delete ${selectedFiles.size} files?`)) {
      return;
    }

    try {
      setDeleting(true);
      setDeleteProgress(0);

      const response = await fetch('/api/drive/cleaner/delete', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          fileIds: Array.from(selectedFiles),
          dryRun: false,
        }),
      });

      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to delete files');
      }

      // Refresh suggestions after deletion
      await loadSuggestions();
      setSelectedFiles(new Set());
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete files');
    } finally {
      setDeleting(false);
      setDeleteProgress(0);
    }
  };

  const formatFileSize = (bytes: number) => {
    const units = ['B', 'KB', 'MB', 'GB', 'TB'];
    let size = bytes;
    let unitIndex = 0;
    
    while (size >= 1024 && unitIndex < units.length - 1) {
      size /= 1024;
      unitIndex++;
    }
    
    return `${size.toFixed(1)} ${units[unitIndex]}`;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-full">
        <AlertTriangle className="h-12 w-12 text-red-500 mb-4" />
        <p className="text-red-500">{error}</p>
        <button
          onClick={loadSuggestions}
          className="mt-4 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      <div className="flex items-center justify-between p-4 border-b">
        <button
          onClick={onBack}
          className="flex items-center text-gray-600 hover:text-gray-900"
        >
          <ArrowLeft className="h-5 w-5 mr-2" />
          Back
        </button>
        <h1 className="text-xl font-semibold">Batch Cleanup</h1>
        <div className="w-20" /> {/* Spacer for alignment */}
      </div>

      <div className="flex-1 overflow-y-auto p-4">
        {Object.entries(categories).map(([category, stats]) => (
          <div key={category} className="mb-6">
            <div className="flex items-center justify-between mb-2">
              <h2 className="text-lg font-medium capitalize">{category}</h2>
              <button
                onClick={() => toggleCategorySelection(category)}
                className="text-sm text-blue-500 hover:text-blue-600"
              >
                {stats.files.every(file => selectedFiles.has(file.id!))
                  ? 'Deselect All'
                  : 'Select All'}
              </button>
            </div>
            <div className="bg-gray-50 rounded-lg p-4">
              <div className="grid grid-cols-1 gap-2">
                {stats.files.map(file => (
                  <div
                    key={file.id}
                    className="flex items-center justify-between p-2 hover:bg-gray-100 rounded"
                  >
                    <div className="flex items-center">
                      <input
                        type="checkbox"
                        checked={selectedFiles.has(file.id!)}
                        onChange={() => toggleFileSelection(file.id!)}
                        className="mr-3"
                      />
                      <div>
                        <p className="font-medium">{file.name}</p>
                        <p className="text-sm text-gray-500">
                          {formatFileSize(typeof file.size === 'string' ? parseInt(file.size) : 0)}
                          {file.modifiedTime && ` • Modified ${new Date(file.modifiedTime).toLocaleDateString()}`}
                        </p>
                      </div>
                    </div>
                    {file.reason && (
                      <p className="text-sm text-gray-500">{file.reason}</p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="border-t p-4">
        <div className="flex items-center justify-between mb-4">
          <div>
            <p className="text-sm text-gray-500">
              {selectedFiles.size} files selected
            </p>
            <p className="text-sm text-gray-500">
              Total size: {formatFileSize(
                Object.values(categories).reduce((sum, category) => {
                  return sum + category.files
                    .filter(file => selectedFiles.has(file.id!))
                    .reduce((fileSum, file) => {
                      return fileSum + (typeof file.size === 'string' ? parseInt(file.size) : 0);
                    }, 0);
                }, 0)
              )}
            </p>
          </div>
          <button
            onClick={handleDelete}
            disabled={selectedFiles.size === 0 || deleting}
            className={`flex items-center px-4 py-2 rounded ${
              selectedFiles.size === 0 || deleting
                ? 'bg-gray-300 cursor-not-allowed'
                : 'bg-red-500 hover:bg-red-600 text-white'
            }`}
          >
            {deleting ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                Deleting...
              </>
            ) : (
              <>
                <Trash2 className="h-4 w-4 mr-2" />
                Delete Selected
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
} 