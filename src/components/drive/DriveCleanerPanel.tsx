import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { 
  Trash2, 
  FileText, 
  Image, 
  Video, 
  Music,
  Archive,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Loader2,
  Eye,
  Download,
  RefreshCw,
  Filter,
  Search,
  Zap,
  HardDrive,
  Clock,
  FileX,
  Sparkles
} from 'lucide-react';

interface SmallFile {
  id: string;
  name: string;
  mimeType: string;
  size: number;
  modifiedTime: string;
  webViewLink?: string;
  thumbnailLink?: string;
  selected: boolean;
  category: 'tiny' | 'small' | 'empty' | 'duplicate';
  reason: string;
}

interface CleanupStats {
  totalFiles: number;
  totalSize: number;
  selectedFiles: number;
  selectedSize: number;
  potentialSavings: number;
}

export default function DriveCleanerUI() {
  const [isScanning, setIsScanning] = useState(false);
  const [isCleaning, setIsCleaning] = useState(false);
  const [smallFiles, setSmallFiles] = useState<SmallFile[]>([]);
  const [filteredFiles, setFilteredFiles] = useState<SmallFile[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [sortBy, setSortBy] = useState<'size' | 'name' | 'date'>('size');
  const [showPreview, setShowPreview] = useState<string | null>(null);
  const [stats, setStats] = useState<CleanupStats>({
    totalFiles: 0,
    totalSize: 0,
    selectedFiles: 0,
    selectedSize: 0,
    potentialSavings: 0
  });

  // Mock data for demonstration
  useEffect(() => {
    const mockFiles: SmallFile[] = [
      {
        id: '1',
        name: 'Untitled document.docx',
        mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        size: 12,
        modifiedTime: '2024-01-15T10:30:00Z',
        selected: false,
        category: 'empty',
        reason: 'Empty document (12 bytes)'
      },
      {
        id: '2',
        name: 'Screenshot 2023-12-01 at 3.45.22 PM.png',
        mimeType: 'image/png',
        size: 1024,
        modifiedTime: '2023-12-01T15:45:22Z',
        selected: false,
        category: 'tiny',
        reason: 'Very small image file (1 KB)'
      },
      {
        id: '3',
        name: 'temp_file_backup_copy.txt',
        mimeType: 'text/plain',
        size: 0,
        modifiedTime: '2024-01-10T09:15:00Z',
        selected: false,
        category: 'empty',
        reason: 'Empty file (0 bytes)'
      },
      {
        id: '4',
        name: 'New folder - Copy.zip',
        mimeType: 'application/zip',
        size: 256,
        modifiedTime: '2023-11-20T14:22:00Z',
        selected: false,
        category: 'small',
        reason: 'Suspiciously small archive'
      },
      {
        id: '5',
        name: 'Presentation1 - Copy.pptx',
        mimeType: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
        size: 45,
        modifiedTime: '2024-01-08T16:30:00Z',
        selected: false,
        category: 'duplicate',
        reason: 'Potential duplicate file'
      },
      {
        id: '6',
        name: '.DS_Store',
        mimeType: 'application/octet-stream',
        size: 6148,
        modifiedTime: '2024-01-12T11:00:00Z',
        selected: false,
        category: 'tiny',
        reason: 'System file (can be safely deleted)'
      }
    ];
    
    setSmallFiles(mockFiles);
    setFilteredFiles(mockFiles);
    updateStats(mockFiles);
  }, []);

  const updateStats = (files: SmallFile[]) => {
    const totalSize = files.reduce((sum, file) => sum + file.size, 0);
    const selectedFiles = files.filter(f => f.selected);
    const selectedSize = selectedFiles.reduce((sum, file) => sum + file.size, 0);
    
    setStats({
      totalFiles: files.length,
      totalSize,
      selectedFiles: selectedFiles.length,
      selectedSize,
      potentialSavings: totalSize
    });
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 B';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const getFileIcon = (mimeType: string) => {
    if (mimeType.startsWith('image/')) return <Image className="w-4 h-4 text-purple-400" />;
    if (mimeType.startsWith('video/')) return <Video className="w-4 h-4 text-red-400" />;
    if (mimeType.startsWith('audio/')) return <Music className="w-4 h-4 text-green-400" />;
    if (mimeType.includes('zip') || mimeType.includes('archive')) return <Archive className="w-4 h-4 text-orange-400" />;
    return <FileText className="w-4 h-4 text-blue-400" />;
  };

  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'empty': return 'bg-red-900/30 border-red-700 text-red-300';
      case 'tiny': return 'bg-orange-900/30 border-orange-700 text-orange-300';
      case 'small': return 'bg-yellow-900/30 border-yellow-700 text-yellow-300';
      case 'duplicate': return 'bg-purple-900/30 border-purple-700 text-purple-300';
      default: return 'bg-gray-900/30 border-gray-700 text-gray-300';
    }
  };

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'empty': return <XCircle className="w-3 h-3" />;
      case 'tiny': return <AlertTriangle className="w-3 h-3" />;
      case 'small': return <FileX className="w-3 h-3" />;
      case 'duplicate': return <RefreshCw className="w-3 h-3" />;
      default: return <FileText className="w-3 h-3" />;
    }
  };

  const handleScan = async () => {
    setIsScanning(true);
    // Simulate scanning process
    await new Promise(resolve => setTimeout(resolve, 3000));
    setIsScanning(false);
  };

  const handleSelectAll = (category?: string) => {
    const updatedFiles = smallFiles.map(file => ({
      ...file,
      selected: category ? file.category === category : true
    }));
    setSmallFiles(updatedFiles);
    setFilteredFiles(updatedFiles.filter(file => 
      (selectedCategory === 'all' || file.category === selectedCategory) &&
      file.name.toLowerCase().includes(searchTerm.toLowerCase())
    ));
    updateStats(updatedFiles);
  };

  const handleFileToggle = (fileId: string) => {
    const updatedFiles = smallFiles.map(file =>
      file.id === fileId ? { ...file, selected: !file.selected } : file
    );
    setSmallFiles(updatedFiles);
    setFilteredFiles(updatedFiles.filter(file => 
      (selectedCategory === 'all' || file.category === selectedCategory) &&
      file.name.toLowerCase().includes(searchTerm.toLowerCase())
    ));
    updateStats(updatedFiles);
  };

  const handleCleanup = async () => {
    setIsCleaning(true);
    // Simulate cleanup process
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    const remainingFiles = smallFiles.filter(file => !file.selected);
    setSmallFiles(remainingFiles);
    setFilteredFiles(remainingFiles);
    updateStats(remainingFiles);
    setIsCleaning(false);
  };

  const handleSearch = (term: string) => {
    setSearchTerm(term);
    const filtered = smallFiles.filter(file => 
      (selectedCategory === 'all' || file.category === selectedCategory) &&
      file.name.toLowerCase().includes(term.toLowerCase())
    );
    setFilteredFiles(filtered);
  };

  const handleCategoryFilter = (category: string) => {
    setSelectedCategory(category);
    const filtered = smallFiles.filter(file => 
      (category === 'all' || file.category === category) &&
      file.name.toLowerCase().includes(searchTerm.toLowerCase())
    );
    setFilteredFiles(filtered);
  };

  const categories = [
    { id: 'all', label: 'All Files', count: smallFiles.length },
    { id: 'empty', label: 'Empty Files', count: smallFiles.filter(f => f.category === 'empty').length },
    { id: 'tiny', label: 'Tiny Files', count: smallFiles.filter(f => f.category === 'tiny').length },
    { id: 'small', label: 'Small Files', count: smallFiles.filter(f => f.category === 'small').length },
    { id: 'duplicate', label: 'Duplicates', count: smallFiles.filter(f => f.category === 'duplicate').length },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 text-white">
      <div className="max-w-7xl mx-auto p-6">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center space-x-3 mb-4">
            <div className="p-3 bg-gradient-to-r from-red-600 to-orange-600 rounded-xl">
              <Sparkles className="w-8 h-8 text-white" />
            </div>
            <div>
              <Link href="/cleaner" className="text-3xl font-bold bg-gradient-to-r from-red-400 to-orange-400 bg-clip-text text-transparent">
                Drive Cleaner
              </Link>
              <p className="text-gray-400">Clean up small, empty, and unnecessary files from your Google Drive</p>
            </div>
          </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <div className="bg-gray-800/50 backdrop-blur-sm border border-gray-700 rounded-xl p-4">
              <div className="flex items-center space-x-3">
                <HardDrive className="w-5 h-5 text-blue-400" />
                <div>
                  <p className="text-sm text-gray-400">Total Files Found</p>
                  <p className="text-xl font-bold text-white">{stats.totalFiles}</p>
                </div>
              </div>
            </div>
            <div className="bg-gray-800/50 backdrop-blur-sm border border-gray-700 rounded-xl p-4">
              <div className="flex items-center space-x-3">
                <FileX className="w-5 h-5 text-orange-400" />
                <div>
                  <p className="text-sm text-gray-400">Total Size</p>
                  <p className="text-xl font-bold text-white">{formatFileSize(stats.totalSize)}</p>
                </div>
              </div>
            </div>
            <div className="bg-gray-800/50 backdrop-blur-sm border border-gray-700 rounded-xl p-4">
              <div className="flex items-center space-x-3">
                <CheckCircle className="w-5 h-5 text-green-400" />
                <div>
                  <p className="text-sm text-gray-400">Selected</p>
                  <p className="text-xl font-bold text-white">{stats.selectedFiles}</p>
                </div>
              </div>
            </div>
            <div className="bg-gray-800/50 backdrop-blur-sm border border-gray-700 rounded-xl p-4">
              <div className="flex items-center space-x-3">
                <Zap className="w-5 h-5 text-purple-400" />
                <div>
                  <p className="text-sm text-gray-400">Will Free Up</p>
                  <p className="text-xl font-bold text-green-400">{formatFileSize(stats.selectedSize)}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={handleScan}
              disabled={isScanning}
              className="flex items-center space-x-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-800 disabled:cursor-not-allowed rounded-lg transition-colors"
            >
              {isScanning ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Search className="w-4 h-4" />
              )}
              <span>{isScanning ? 'Scanning Drive...' : 'Scan Drive'}</span>
            </button>

            <button
              onClick={() => handleSelectAll()}
              className="flex items-center space-x-2 px-4 py-2 bg-purple-600 hover:bg-purple-700 rounded-lg transition-colors"
            >
              <CheckCircle className="w-4 h-4" />
              <span>Select All</span>
            </button>

            <button
              onClick={handleCleanup}
              disabled={isCleaning || stats.selectedFiles === 0}
              className="flex items-center space-x-2 px-4 py-2 bg-red-600 hover:bg-red-700 disabled:bg-red-800 disabled:cursor-not-allowed rounded-lg transition-colors"
            >
              {isCleaning ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Trash2 className="w-4 h-4" />
              )}
              <span>{isCleaning ? 'Cleaning...' : `Delete ${stats.selectedFiles} Files`}</span>
            </button>
          </div>
        </div>

        {/* Filters and Search */}
        <div className="mb-6 space-y-4">
          {/* Search Bar */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search files by name..."
              value={searchTerm}
              onChange={(e) => handleSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-3 bg-gray-800/50 border border-gray-700 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          {/* Category Filters */}
          <div className="flex flex-wrap gap-2">
            {categories.map(category => (
              <button
                key={category.id}
                onClick={() => handleCategoryFilter(category.id)}
                className={`flex items-center space-x-2 px-3 py-2 rounded-lg transition-colors ${
                  selectedCategory === category.id
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-800/50 border border-gray-700 text-gray-300 hover:bg-gray-700'
                }`}
              >
                <span>{category.label}</span>
                <span className="bg-gray-600 text-xs px-2 py-1 rounded-full">{category.count}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Files List */}
        <div className="bg-gray-800/30 backdrop-blur-sm border border-gray-700 rounded-xl overflow-hidden">
          <div className="p-4 bg-gray-800/50 border-b border-gray-700">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-medium text-white">Files to Clean</h3>
              <div className="flex items-center space-x-2 text-sm text-gray-400">
                <span>Sort by:</span>
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as any)}
                  className="bg-gray-700 border border-gray-600 rounded px-2 py-1 text-white"
                >
                  <option value="size">Size</option>
                  <option value="name">Name</option>
                  <option value="date">Date</option>
                </select>
              </div>
            </div>
          </div>

          <div className="max-h-96 overflow-y-auto">
            {filteredFiles.length === 0 ? (
              <div className="p-8 text-center">
                <div className="w-16 h-16 bg-green-600/20 rounded-full mx-auto mb-4 flex items-center justify-center">
                  <CheckCircle className="w-8 h-8 text-green-400" />
                </div>
                <h3 className="text-lg font-medium text-white mb-2">All Clean!</h3>
                <p className="text-gray-400">No small or unnecessary files found.</p>
              </div>
            ) : (
              <div className="divide-y divide-gray-700">
                {filteredFiles.map((file) => (
                  <div
                    key={file.id}
                    className={`p-4 hover:bg-gray-800/30 transition-colors ${
                      file.selected ? 'bg-blue-900/20 border-l-4 border-blue-500' : ''
                    }`}
                  >
                    <div className="flex items-center space-x-4">
                      <input
                        type="checkbox"
                        checked={file.selected}
                        onChange={() => handleFileToggle(file.id)}
                        className="w-4 h-4 text-blue-600 bg-gray-700 border-gray-600 rounded focus:ring-blue-500"
                      />
                      
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center space-x-3 mb-2">
                          {getFileIcon(file.mimeType)}
                          <span className="text-white font-medium truncate">{file.name}</span>
                          <span className={`px-2 py-1 rounded-full text-xs border ${getCategoryColor(file.category)}`}>
                            <div className="flex items-center space-x-1">
                              {getCategoryIcon(file.category)}
                              <span>{file.category}</span>
                            </div>
                          </span>
                        </div>
                        
                        <div className="flex items-center space-x-4 text-sm text-gray-400">
                          <span>{formatFileSize(file.size)}</span>
                          <span className="flex items-center space-x-1">
                            <Clock className="w-3 h-3" />
                            <span>{new Date(file.modifiedTime).toLocaleDateString()}</span>
                          </span>
                          <span className="text-orange-400">{file.reason}</span>
                        </div>
                      </div>

                      <div className="flex items-center space-x-2">
                        {file.webViewLink && (
                          <button
                            onClick={() => window.open(file.webViewLink, '_blank')}
                            className="p-2 hover:bg-gray-700 rounded-lg transition-colors"
                            title="Preview file"
                          >
                            <Eye className="w-4 h-4 text-gray-400" />
                          </button>
                        )}
                        <button
                          className="p-2 hover:bg-gray-700 rounded-lg transition-colors"
                          title="Download file"
                        >
                          <Download className="w-4 h-4 text-gray-400" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Quick Actions */}
        {filteredFiles.length > 0 && (
          <div className="mt-6 p-4 bg-gray-800/30 backdrop-blur-sm border border-gray-700 rounded-xl">
            <h4 className="text-lg font-medium text-white mb-3">Quick Actions</h4>
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => handleSelectAll('empty')}
                className="px-3 py-2 bg-red-600/20 border border-red-700 text-red-300 rounded-lg hover:bg-red-600/30 transition-colors"
              >
                Select All Empty Files ({smallFiles.filter(f => f.category === 'empty').length})
              </button>
              <button
                onClick={() => handleSelectAll('tiny')}
                className="px-3 py-2 bg-orange-600/20 border border-orange-700 text-orange-300 rounded-lg hover:bg-orange-600/30 transition-colors"
              >
                Select All Tiny Files ({smallFiles.filter(f => f.category === 'tiny').length})
              </button>
              <button
                onClick={() => handleSelectAll('duplicate')}
                className="px-3 py-2 bg-purple-600/20 border border-purple-700 text-purple-300 rounded-lg hover:bg-purple-600/30 transition-colors"
              >
                Select All Duplicates ({smallFiles.filter(f => f.category === 'duplicate').length})
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}