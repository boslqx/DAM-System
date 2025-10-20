"use client";

import { useEffect, useState, useCallback, lazy, Suspense } from "react";
import {
  Box,
  Grid,
  GridItem,
  Image,
  Text,
  VStack,
  Heading,
  Spinner,
  Flex,
  Button,
  useToast,
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalCloseButton,
  useDisclosure,
  Badge,
  HStack,
  IconButton,
  Tooltip,
} from "@chakra-ui/react";
import { useDropzone } from "react-dropzone";
import { Worker, Viewer } from "@react-pdf-viewer/core";
import "@react-pdf-viewer/core/lib/styles/index.css";
import "@react-pdf-viewer/default-layout/lib/styles/index.css";
import Sidebar from "@/components/Sidebar";
import { useRouter } from "next/navigation";
import { EditIcon, DownloadIcon } from "@chakra-ui/icons";

// Import new components
import AssetFilters from "@/components/AssetFilters";
import EditAssetModal from "@/components/EditAssetModal";

// Lazy load Babylon viewer for better performance
const BabylonViewer = lazy(() => import("@/components/BabylonViewer"));

type Asset = {
  id: number;
  name: string;
  description: string;
  file: string;
  file_type: string;
  file_size: number;
  created_at: string;
  category: string;
  tags: string[];
  keywords: string;
  is_public: boolean;
  created_by_username: string;
  download_url?: string;
};

export default function Dashboard() {
  const router = useRouter();
  const [role, setRole] = useState<string | null>(null);
  const [assets, setAssets] = useState<Asset[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [selectedAsset, setSelectedAsset] = useState<Asset | null>(null);
  const [editingAsset, setEditingAsset] = useState<Asset | null>(null);
  
  // New state for filters and metadata
  const [filters, setFilters] = useState({
    search: "",
    category: "",
    file_type: "",
    tags: "",
    date_from: "",
    date_to: "",
  });
  const [availableCategories, setAvailableCategories] = useState<string[]>([]);
  const [availableTags, setAvailableTags] = useState<string[]>([]);

  const toast = useToast();
  const { isOpen, onOpen, onClose } = useDisclosure();

  // 🔹 Check login & role from localStorage
  useEffect(() => {
    const token = localStorage.getItem("token");
    const storedRole = localStorage.getItem("role");
    if (!token || !storedRole) {
      router.push("/login");
    } else {
      setRole(storedRole);
    }
  }, [router]);

  // 🔹 Fetch metadata (categories and tags)
  const fetchMetadata = async () => {
    try {
      const token = localStorage.getItem("token");
      const [categoriesRes, tagsRes] = await Promise.all([
        fetch("http://127.0.0.1:8000/api/assets/categories/", {
          headers: { Authorization: `Token ${token}` },
        }),
        fetch("http://127.0.0.1:8000/api/assets/tags/", {
          headers: { Authorization: `Token ${token}` },
        }),
      ]);
      
      if (categoriesRes.ok) {
        const categories = await categoriesRes.json();
        setAvailableCategories(categories);
      }
      if (tagsRes.ok) {
        const tags = await tagsRes.json();
        setAvailableTags(tags);
      }
    } catch (error) {
      console.error("Error fetching metadata:", error);
    }
  };

  // 🔹 Enhanced fetch assets with filters
  const fetchAssets = async () => {
    const token = localStorage.getItem("token");
    if (!token) {
      router.push("/login");
      return;
    }

    try {
      setLoading(true);
      
      // Build query parameters from filters
      const params = new URLSearchParams();
      Object.entries(filters).forEach(([key, value]) => {
        if (value) params.append(key, value);
      });
      
      const queryString = params.toString();
      const url = `http://127.0.0.1:8000/api/assets/${queryString ? `?${queryString}` : ''}`;

      const res = await fetch(url, {
        headers: {
          Authorization: `Token ${token}`,
        },
      });

      if (!res.ok) {
        throw new Error(`Failed to fetch assets: ${res.status}`);
      }

      const data = await res.json();
      
      if (Array.isArray(data)) {
        setAssets(data);
      } else if (data.results && Array.isArray(data.results)) {
        setAssets(data.results);
      } else {
        setAssets([]);
      }
    } catch (err) {
      console.error("Error fetching assets:", err);
      toast({
        title: "Error loading assets",
        status: "error",
        duration: 3000,
        isClosable: true,
      });
      setAssets([]);
    } finally {
      setLoading(false);
    }
  };

  // 🔹 Initial data fetch
  useEffect(() => {
    fetchAssets();
    fetchMetadata();
  }, []);

  // 🔹 Refetch when filters change
  useEffect(() => {
    fetchAssets();
  }, [filters]);

  // 🔹 File upload handler
  const onDrop = useCallback(
    async (acceptedFiles: File[]) => {
      if (role !== "Admin" && role !== "Editor") {
        toast({ title: "Access denied", status: "error" });
        return;
      }

      const file = acceptedFiles[0];
      if (!file) return;

      setUploading(true);
      const formData = new FormData();
      formData.append("name", file.name);
      formData.append("file", file);

      const ext = file.name.split(".").pop()?.toLowerCase();
      let detectedType = "OTH";
      if (["jpg", "jpeg", "png", "gif", "webp"].includes(ext!)) detectedType = "IMG";
      else if (["mp4", "mov", "avi", "webm"].includes(ext!)) detectedType = "VID";
      else if (["pdf", "doc", "docx", "ppt", "pptx", "xls", "xlsx", "txt"].includes(ext!)) detectedType = "DOC";
      else if (["glb", "gltf", "obj", "fbx"].includes(ext!)) detectedType = "3D";

      formData.append("file_type", detectedType);

      const res = await fetch("http://127.0.0.1:8000/api/assets/", {
        method: "POST",
        body: formData,
        headers: {
          Authorization: `Token ${localStorage.getItem("token")}`,
        },
      });

      if (res.ok) {
        const newAsset = await res.json();
        setAssets((prev) => [newAsset, ...prev]);
        toast({ title: "Upload successful!", status: "success" });
        
        // Refresh metadata after upload
        fetchMetadata();
      } else {
        toast({ title: "Upload failed!", status: "error" });
      }
      setUploading(false);
    },
    [role, toast]
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { "*/*": [] },
  });

  // 🔹 Handle asset update
  const handleUpdateAsset = async (assetData: any) => {
    const token = localStorage.getItem("token");
    const res = await fetch(`http://127.0.0.1:8000/api/assets/${assetData.id}/`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Token ${token}`,
      },
      body: JSON.stringify(assetData),
    });
    
    if (!res.ok) throw new Error("Failed to update asset");
    
    // Refresh assets and metadata
    fetchAssets();
    fetchMetadata();
  };

  // 🔹 Handle asset deletion
  const handleDeleteAsset = async (assetId: number) => {
    if (!confirm("Are you sure you want to delete this asset?")) return;

    try {
      const token = localStorage.getItem("token");
      const res = await fetch(`http://127.0.0.1:8000/api/assets/${assetId}/`, {
        method: "DELETE",
        headers: {
          Authorization: `Token ${token}`,
        },
      });

      if (res.ok) {
        setAssets(assets.filter(asset => asset.id !== assetId));
        toast({
          title: "Asset deleted successfully",
          status: "success",
          duration: 3000,
          isClosable: true,
        });
        
        // Refresh metadata
        fetchMetadata();
      } else {
        throw new Error("Failed to delete asset");
      }
    } catch (error) {
      toast({
        title: "Error deleting asset",
        status: "error",
        duration: 4000,
        isClosable: true,
      });
    }
  };

  // Helper function to get file extension
  const getFileExtension = (filename: string): string => {
    return filename.split('.').pop()?.toLowerCase() || '';
  };

  // Helper function to determine preview type
  const getPreviewType = (asset: Asset): string => {
    const extension = getFileExtension(asset.name);
    if (asset.file_type === 'IMG') return 'image';
    if (asset.file_type === 'VID') return 'video';
    if (asset.file_type === '3D') return '3d';
    if (asset.file_type === 'DOC') {
      return extension === 'pdf' ? 'pdf' : 'document';
    }
    
    // Fallback: check by file extension
    if (['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(extension)) return 'image';
    if (['mp4', 'mov', 'avi', 'webm'].includes(extension)) return 'video';
    if (['pdf'].includes(extension)) return 'pdf';
    if (['glb', 'gltf', 'obj', 'fbx'].includes(extension)) return '3d';
    if (['doc', 'docx', 'ppt', 'pptx', 'xls', 'xlsx', 'txt'].includes(extension)) return 'document';
    
    return 'other';
  };

  const handlePreview = (asset: Asset) => {
    setSelectedAsset(asset);
    onOpen();
  };

  // Get full file URL (handles relative URLs from Django)
  const getFullFileUrl = (fileUrl: string): string => {
    if (fileUrl.startsWith('http')) {
      return fileUrl;
    }
    return `http://127.0.0.1:8000${fileUrl}`;
  };

  if (!role) {
    return (
      <Flex justify="center" align="center" minH="100vh">
        <Spinner size="xl" color="brand.200" />
      </Flex>
    );
  }

  return (
    <Flex>
      <Sidebar />
      <Box flex="1" p={8} bg="brand.50" minH="100vh" ml={{ base: "0", md: "60px" }} transition="margin 0.3s ease">
        <Heading mb={6} color="gray.700">
          Asset Dashboard
        </Heading>

        {/* 🔹 NEW: Search and Filter Component */}
        <AssetFilters
          onFiltersChange={setFilters}
          availableCategories={availableCategories}
          availableTags={availableTags}
        />

        {/* 🔹 Editor & Admin upload */}
        {(role === "Admin" || role === "Editor") && (
          <Box
            {...getRootProps()}
            border="2px dashed"
            borderColor={isDragActive ? "brand.300" : "brand.200"}
            bg={isDragActive ? "brand.100" : "white"}
            borderRadius="xl"
            p={10}
            textAlign="center"
            mb={8}
            cursor="pointer"
            transition="0.2s ease"
          >
            <input {...getInputProps()} />
            {uploading ? (
              <Spinner size="lg" color="brand.200" />
            ) : isDragActive ? (
              <Text color="brand.300" fontWeight="bold">
                Drop your file here...
              </Text>
            ) : (
              <>
                <Text fontSize="lg" color="brand.200">
                  Drag & Drop or Click to Upload
                </Text>
                <Text fontSize="sm" color="gray.600">
                  Supported: Any file type (images, videos, PDFs, documents, 3D models, etc.)
                </Text>
              </>
            )}
          </Box>
        )}

        {/* 🔹 Asset Grid (all roles) */}
        {loading ? (
          <Flex justify="center" align="center" py={8}>
            <Spinner size="xl" color="brand.200" />
          </Flex>
        ) : assets.length === 0 ? (
          <Flex justify="center" align="center" py={8} direction="column" gap={3}>
            <Text color="gray.500">No assets found.</Text>
            {(filters.search || filters.category || filters.file_type || filters.tags) && (
              <Button colorScheme="blue" variant="ghost" size="sm" onClick={() => setFilters({
                search: "", category: "", file_type: "", tags: "", date_from: "", date_to: ""
              })}>
                Clear filters to see all assets
              </Button>
            )}
          </Flex>
        ) : (
          <Grid templateColumns="repeat(auto-fill, minmax(280px, 1fr))" gap={6}>
            {assets.map((asset) => {
              const displayType = getPreviewType(asset);
              return (
                <GridItem
                  key={asset.id}
                  bg="white"
                  borderRadius="xl"
                  p={4}
                  boxShadow="sm"
                  border="1px solid"
                  borderColor="gray.200"
                  _hover={{ boxShadow: "md", transform: "translateY(-4px)" }}
                  transition="0.2s ease"
                  cursor="pointer"
                >
                  <VStack align="start" spacing={3}>
                    {/* Preview Image/Thumbnail */}
                    {displayType === "image" && (
                      <Image
                        src={getFullFileUrl(asset.file)}
                        alt={asset.name}
                        borderRadius="md"
                        w="100%"
                        h="150px"
                        objectFit="cover"
                        onClick={() => handlePreview(asset)}
                        fallback={
                          <Box w="100%" h="150px" bg="gray.100" borderRadius="md" display="flex" alignItems="center" justifyContent="center">
                            <Text color="gray.500">Image not loading</Text>
                          </Box>
                        }
                      />
                    )}
                    {displayType === "video" && (
                      <Box w="100%" h="150px" bg="gray.800" borderRadius="md" display="flex" alignItems="center" justifyContent="center" position="relative" onClick={() => handlePreview(asset)}>
                        <video
                          src={getFullFileUrl(asset.file)}
                          style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '8px' }}
                        />
                        <Box position="absolute" bottom="2" right="2" bg="black" color="white" px={2} py={1} borderRadius="md" fontSize="xs">
                          ▶️
                        </Box>
                      </Box>
                    )}
                    {displayType === "pdf" && (
                      <Box w="100%" h="150px" bg="red.100" borderRadius="md" display="flex" alignItems="center" justifyContent="center" onClick={() => handlePreview(asset)}>
                        <Box textAlign="center">
                          <Text fontWeight="bold" color="red.600">
                            📄 PDF
                          </Text>
                          <Text fontSize="sm" color="red.600" mt={1}>
                            {asset.name}
                          </Text>
                        </Box>
                      </Box>
                    )}
                    {displayType === "document" && (
                      <Box w="100%" h="150px" bg="blue.100" borderRadius="md" display="flex" alignItems="center" justifyContent="center" onClick={() => handlePreview(asset)}>
                        <Box textAlign="center">
                          <Text fontWeight="bold" color="blue.600">
                            📝 Document
                          </Text>
                          <Text fontSize="sm" color="blue.600" mt={1}>
                            {asset.name}
                          </Text>
                        </Box>
                      </Box>
                    )}
                    {displayType === "3d" && (
                      <Box w="100%" h="150px" bg="purple.100" borderRadius="md" display="flex" alignItems="center" justifyContent="center" onClick={() => handlePreview(asset)}>
                        <Box textAlign="center">
                          <Text fontWeight="bold" color="purple.600">
                            🎯 3D Model
                          </Text>
                          <Text fontSize="sm" color="purple.600" mt={1}>
                            {asset.name}
                          </Text>
                        </Box>
                      </Box>
                    )}
                    {displayType === "other" && (
                      <Box w="100%" h="150px" bg="gray.100" borderRadius="md" display="flex" alignItems="center" justifyContent="center" onClick={() => handlePreview(asset)}>
                        <Box textAlign="center">
                          <Text color="gray.600">
                            📁 File
                          </Text>
                          <Text fontSize="sm" color="gray.600" mt={1}>
                            {asset.name}
                          </Text>
                        </Box>
                      </Box>
                    )}

                    {/* Asset Info */}
                    <Box w="100%">
                      <Text fontWeight="bold" noOfLines={1}>{asset.name}</Text>
                      <Text fontSize="sm" color="gray.600" noOfLines={2}>
                        {asset.description || "No description"}
                      </Text>
                      
                      {/* Tags */}
                      {asset.tags && asset.tags.length > 0 && (
                        <Flex wrap="wrap" gap={1} mt={2}>
                          {asset.tags.slice(0, 3).map((tag, index) => (
                            <Badge key={index} colorScheme="blue" variant="subtle" size="sm">
                              {tag}
                            </Badge>
                          ))}
                          {asset.tags.length > 3 && (
                            <Badge colorScheme="gray" variant="subtle" size="sm">
                              +{asset.tags.length - 3}
                            </Badge>
                          )}
                        </Flex>
                      )}
                      
                      <Text fontSize="xs" color="gray.500" mt={2}>
                        Type: {asset.file_type} • Size: {(asset.file_size / 1024 / 1024).toFixed(1)}MB
                      </Text>
                      <Text fontSize="xs" color="gray.500">
                        By: {asset.created_by_username}
                      </Text>
                    </Box>

                    {/* Action Buttons */}
                    <Flex justify="space-between" w="100%" pt={2}>
                      <HStack>
                        {/* Download Button */}
                        <Tooltip label="Download asset">
                          <IconButton
                            aria-label="Download asset"
                            icon={<DownloadIcon />}
                            size="sm"
                            variant="ghost"
                            colorScheme="blue"
                            as="a"
                            href={asset.download_url || getFullFileUrl(asset.file)}
                            download
                            onClick={(e) => e.stopPropagation()}
                          />
                        </Tooltip>

                        {/* Edit Button (Admin & Editor only) */}
                        {(role === "Admin" || role === "Editor") && (
                          <Tooltip label="Edit asset">
                            <IconButton
                              aria-label="Edit asset"
                              icon={<EditIcon />}
                              size="sm"
                              variant="ghost"
                              colorScheme="green"
                              onClick={(e) => {
                                e.stopPropagation();
                                setEditingAsset(asset);
                              }}
                            />
                          </Tooltip>
                        )}
                      </HStack>

                      {/* Public/Private Badge */}
                      <Badge colorScheme={asset.is_public ? "green" : "orange"}>
                        {asset.is_public ? "Public" : "Private"}
                      </Badge>
                    </Flex>
                  </VStack>
                </GridItem>
              );
            })}
          </Grid>
        )}

        {/* 🔹 Preview Modal */}
        <Modal isOpen={isOpen} onClose={onClose} size="4xl" isCentered>
          <ModalOverlay />
          <ModalContent maxH="90vh" overflow="hidden">
            <ModalHeader bg="white" borderBottom="1px" borderColor="gray.200">
              {selectedAsset?.name}
              <Text fontSize="sm" color="gray.600" fontWeight="normal">
                Type: {selectedAsset?.file_type} • Size: {selectedAsset ? ((selectedAsset.file_size / 1024 / 1024).toFixed(1)) : 0}MB
              </Text>
            </ModalHeader>
            <ModalCloseButton />
            <ModalBody p={0} display="flex" justifyContent="center" alignItems="center" bg="gray.50" minH="400px">
              {selectedAsset && (() => {
                const previewType = getPreviewType(selectedAsset);
                const fullFileUrl = getFullFileUrl(selectedAsset.file);
                
                switch (previewType) {
                  case 'image':
                    return (
                      <Image
                        src={fullFileUrl}
                        alt={selectedAsset.name}
                        maxH="70vh"
                        objectFit="contain"
                        w="auto"
                      />
                    );
                  case 'video':
                    return (
                      <Box w="100%" p={4}>
                        <video
                          src={fullFileUrl}
                          controls
                          autoPlay
                          style={{ width: '100%', maxHeight: '70vh', borderRadius: '8px' }}
                        >
                          Your browser does not support the video tag.
                        </video>
                      </Box>
                    );
                  case 'pdf':
                    return (
                      <Box w="100%" h="600px">
                        <Worker workerUrl="https://unpkg.com/pdfjs-dist@3.11.174/build/pdf.worker.min.js">
                          <Viewer fileUrl={fullFileUrl} />
                        </Worker>
                      </Box>
                    );
                  case '3d':
                    return (
                      <Box w="100%" h="600px">
                        <Suspense fallback={
                          <Flex justify="center" align="center" h="100%">
                            <Spinner size="xl" color="purple.500" />
                            <Text ml={3}>Loading 3D Viewer...</Text>
                          </Flex>
                        }>
                          <BabylonViewer modelUrl={fullFileUrl} />
                        </Suspense>
                      </Box>
                    );
                  case 'document':
                  case 'other':
                  default:
                    return (
                      <Box textAlign="center" p={8} w="100%">
                        <Text fontSize="xl" mb={4} color="gray.600">
                          {previewType === 'document' ? 'Document' : 'File'} Preview
                        </Text>
                        <Text mb={6} color="gray.500">
                          Preview not available in browser
                        </Text>
                        <VStack spacing={3}>
                          <Button
                            as="a"
                            href={fullFileUrl}
                            download
                            colorScheme="blue"
                            size="lg"
                          >
                            Download File
                          </Button>
                          <Button
                            as="a"
                            href={fullFileUrl}
                            target="_blank"
                            variant="outline"
                          >
                            Open in New Tab
                          </Button>
                        </VStack>
                      </Box>
                    );
                }
              })()}
            </ModalBody>
          </ModalContent>
        </Modal>

        {/* 🔹 NEW: Edit Asset Modal */}
        <EditAssetModal
          isOpen={!!editingAsset}
          onClose={() => setEditingAsset(null)}
          asset={editingAsset}
          onSave={handleUpdateAsset}
          availableCategories={availableCategories}
        />
      </Box>
    </Flex>
  );
}