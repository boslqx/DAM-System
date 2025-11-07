"use client";

import { useEffect, useState, lazy, Suspense } from "react";
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
  Input,
  InputGroup,
  InputLeftElement,
  Icon,
  Select,
  Table,
  Thead,
  Tbody,
  Tr,
  Th,
  Td,
  Tag,
  TagLabel,
  TagCloseButton,
} from "@chakra-ui/react";
import { Worker, Viewer } from "@react-pdf-viewer/core";
import "@react-pdf-viewer/core/lib/styles/index.css";
import "@react-pdf-viewer/default-layout/lib/styles/index.css";
import Sidebar from "@/components/Sidebar";
import { useRouter } from "next/navigation";
import { 
  EditIcon, 
  DownloadIcon, 
  SearchIcon,
  StarIcon,
  DeleteIcon,
  ExternalLinkIcon
} from "@chakra-ui/icons";
import { 
  FiImage, 
  FiGrid, 
  FiList,
  FiFolder
} from "react-icons/fi";

import EditAssetModal from "@/components/EditAssetModal";
import FavoriteButton from "@/components/FavoriteButton";
import ImageSearchModal from "@/components/ImageSearchModal";

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
  is_favorited?: boolean;
  favorites_count?: number;
};

export default function Dashboard() {
  const router = useRouter();
  const [role, setRole] = useState<string | null>(null);
  const [assets, setAssets] = useState<Asset[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedAsset, setSelectedAsset] = useState<Asset | null>(null);
  const [editingAsset, setEditingAsset] = useState<Asset | null>(null);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

  // Filter states
  const [quickSearch, setQuickSearch] = useState("");
  const [selectedFileType, setSelectedFileType] = useState("");
  const [selectedTags, setSelectedTags] = useState<string[]>([]);

  const [availableCategories, setAvailableCategories] = useState<string[]>([]);
  const [availableTags, setAvailableTags] = useState<string[]>([]);

  const toast = useToast();
  const { isOpen, onOpen, onClose } = useDisclosure();
  const { 
    isOpen: isImageSearchOpen, 
    onOpen: onImageSearchOpen, 
    onClose: onImageSearchClose 
  } = useDisclosure();

  useEffect(() => {
    const token = localStorage.getItem("token");
    const storedRole = localStorage.getItem("role");
    if (!token || !storedRole) {
      router.push("/login");
    } else {
      setRole(storedRole);
    }
  }, [router]);

  const fetchMetadata = async () => {
    try {
      const token = localStorage.getItem("token");
      const response = await fetch("http://127.0.0.1:8000/api/assets/", {
        headers: { Authorization: `Token ${token}` },
      });

      if (response.ok) {
        const data = await response.json();
        const assets = Array.isArray(data) ? data : data.results || [];
        
        // Extract unique categories
        const categories = [...new Set(assets.map((a: Asset) => a.category).filter(Boolean))];
        setAvailableCategories(categories as string[]);

        // Extract unique tags
        const tags = [...new Set(assets.flatMap((a: Asset) => a.tags || []))];
        setAvailableTags(tags as string[]);
      }
    } catch (error) {
      console.error("Error fetching metadata:", error);
    }
  };

  const fetchAssets = async () => {
    const token = localStorage.getItem("token");
    if (!token) {
      router.push("/login");
      return;
    }

    try {
      setLoading(true);

      const params = new URLSearchParams();
      if (quickSearch.trim()) params.append('search', quickSearch);
      if (selectedFileType) params.append('file_type', selectedFileType);
      if (selectedTags.length > 0) params.append('tags', selectedTags.join(','));

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

  useEffect(() => {
    fetchAssets();
    fetchMetadata();
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchAssets();
    }, 500);
    return () => clearTimeout(timer);
  }, [quickSearch, selectedFileType, selectedTags]);

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

    fetchAssets();
    fetchMetadata();
  };

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

  const getFileExtension = (filename: string): string => {
    return filename.split('.').pop()?.toLowerCase() || '';
  };

  const getPreviewType = (asset: Asset): string => {
    const extension = getFileExtension(asset.name);
    if (asset.file_type === 'IMG') return 'image';
    if (asset.file_type === 'VID') return 'video';
    if (asset.file_type === '3D') return '3d';
    if (asset.file_type === 'DOC') {
      return extension === 'pdf' ? 'pdf' : 'document';
    }

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

  const getFullFileUrl = (fileUrl: string): string => {
    if (fileUrl.startsWith('http')) {
      return fileUrl;
    }
    return `http://127.0.0.1:8000${fileUrl}`;
  };

  const removeTag = (tag: string) => {
    setSelectedTags(selectedTags.filter(t => t !== tag));
  };

  const clearAllFilters = () => {
    setQuickSearch("");
    setSelectedFileType("");
    setSelectedTags([]);
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const formatDate = (dateString: string): string => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
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
        
        {/* Enhanced Search and Filter Bar */}
        <Box mb={6}>
          <Flex gap={4} mb={4} flexWrap="wrap" align="flex-end">
            {/* Search Input */}
            <Box flex="1" minW="300px">
              <InputGroup size="lg">
                <InputLeftElement pointerEvents="none">
                  <SearchIcon color="brand.200" />
                </InputLeftElement>
                <Input
                  placeholder="Search assets..."
                  value={quickSearch}
                  onChange={(e) => setQuickSearch(e.target.value)}
                  bg="white"
                  borderWidth="2px"
                  borderColor="brand.200"
                  _hover={{
                    borderColor: "brand.300",
                  }}
                  _focus={{
                    borderColor: "brand.300",
                    boxShadow: "0 4px 12px rgba(166, 146, 199, 0.3)"
                  }}
                  borderRadius="xl"
                />
              </InputGroup>
            </Box>

            {/* File Type Filter ONLY - Categories Removed */}
            <Select
              placeholder="All Types"
              value={selectedFileType}
              onChange={(e) => setSelectedFileType(e.target.value)}
              bg="white"
              size="lg"
              maxW="180px"
              borderRadius="xl"
              borderWidth="2px"
              borderColor="gray.200"
            >
              <option value="IMG">Images</option>
              <option value="VID">Videos</option>
              <option value="DOC">Documents</option>
              <option value="3D">3D Models</option>
              <option value="OTH">Other</option>
            </Select>

            {/* View Mode Toggle */}
            <HStack spacing={2} bg="white" p={1} borderRadius="xl" boxShadow="sm">
              <Tooltip label="Grid View">
                <IconButton
                  aria-label="Grid view"
                  icon={<Icon as={FiGrid} />}
                  onClick={() => setViewMode('grid')}
                  colorScheme={viewMode === 'grid' ? 'brand' : 'gray'}
                  variant={viewMode === 'grid' ? 'solid' : 'ghost'}
                  size="md"
                />
              </Tooltip>
              <Tooltip label="List View">
                <IconButton
                  aria-label="List view"
                  icon={<Icon as={FiList} />}
                  onClick={() => setViewMode('list')}
                  colorScheme={viewMode === 'list' ? 'brand' : 'gray'}
                  variant={viewMode === 'list' ? 'solid' : 'ghost'}
                  size="md"
                />
              </Tooltip>
            </HStack>

            {/* Image Search Button */}
            <Button
              leftIcon={<Icon as={FiImage} />}
              colorScheme="purple"
              onClick={onImageSearchOpen}
              size="lg"
              borderRadius="xl"
            >
              Search by Image
            </Button>

            {/* New Folder Button */}
            <Button
              leftIcon={<Icon as={FiFolder} />}
              colorScheme="blue"
              size="lg"
              borderRadius="xl"
              onClick={() => {
                toast({
                  title: "Feature Coming Soon",
                  description: "Folder management will be available in the next update",
                  status: "info",
                  duration: 3000,
                });
              }}
            >
              New Folder
            </Button>
          </Flex>

          {/* Active Filters Display - Updated to remove categories */}
          {(selectedFileType || quickSearch) && (
            <Flex gap={2} align="center" flexWrap="wrap">
              <Text fontSize="sm" color="gray.600" fontWeight="medium">Active Filters:</Text>
              
              {quickSearch && (
                <Tag size="md" colorScheme="blue" borderRadius="full">
                  <TagLabel>Search: {quickSearch}</TagLabel>
                  <TagCloseButton onClick={() => setQuickSearch("")} />
                </Tag>
              )}
              
              {selectedFileType && (
                <Tag size="md" colorScheme="purple" borderRadius="full">
                  <TagLabel>{selectedFileType}</TagLabel>
                  <TagCloseButton onClick={() => setSelectedFileType("")} />
                </Tag>
              )}

              <Button size="sm" variant="ghost" colorScheme="red" onClick={clearAllFilters}>
                Clear All
              </Button>
            </Flex>
          )}

          {/* Results Info */}
          {!loading && (
            <Text color="gray.600" fontSize="sm" mt={2}>
              Found {assets.length} asset{assets.length !== 1 ? 's' : ''}
            </Text>
          )}
        </Box>

        {/* Asset Display */}
        {loading ? (
          <Flex justify="center" align="center" py={8}>
            <Spinner size="xl" color="brand.200" />
          </Flex>
        ) : assets.length === 0 ? (
          <Flex justify="center" align="center" py={8} direction="column" gap={3}>
            <Text color="gray.500">No assets found.</Text>
            <Button colorScheme="blue" variant="ghost" size="sm" onClick={clearAllFilters}>
              Clear filters to see all assets
            </Button>
          </Flex>
        ) : viewMode === 'grid' ? (
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
                  onClick={() => handlePreview(asset)}
                >
                  <VStack align="start" spacing={3}>
                    {/* Preview Image */}
                    <Box position="relative" w="100%" h="150px">
                      {displayType === "image" && (
                        <Image
                          src={getFullFileUrl(asset.file)}
                          alt={asset.name}
                          borderRadius="md"
                          w="100%"
                          h="100%"
                          objectFit="cover"
                          fallback={
                            <Box w="100%" h="100%" bg="gray.100" borderRadius="md" display="flex" alignItems="center" justifyContent="center">
                              <Text color="gray.500">Image not loading</Text>
                            </Box>
                          }
                        />
                      )}
                      {displayType === "video" && (
                        <Box w="100%" h="100%" bg="gray.800" borderRadius="md" display="flex" alignItems="center" justifyContent="center">
                          <Text color="white" fontSize="xl">🎥</Text>
                        </Box>
                      )}
                      {displayType === "3d" && (
                        <Box w="100%" h="100%" bg="purple.100" borderRadius="md" display="flex" alignItems="center" justifyContent="center">
                          <Text color="purple.600" fontSize="xl">🎯</Text>
                        </Box>
                      )}
                      {displayType === "pdf" && (
                        <Box w="100%" h="100%" bg="red.100" borderRadius="md" display="flex" alignItems="center" justifyContent="center">
                          <Text color="red.600" fontSize="xl">📄</Text>
                        </Box>
                      )}
                      {displayType === "document" && (
                        <Box w="100%" h="100%" bg="blue.100" borderRadius="md" display="flex" alignItems="center" justifyContent="center">
                          <Text color="blue.600" fontSize="xl">📝</Text>
                        </Box>
                      )}
                      {displayType === "other" && (
                        <Box w="100%" h="100%" bg="gray.100" borderRadius="md" display="flex" alignItems="center" justifyContent="center">
                          <Text color="gray.600" fontSize="xl">📁</Text>
                        </Box>
                      )}
                      <FavoriteButton
                        assetId={asset.id}
                        isFavorited={asset.is_favorited}
                        onToggle={fetchAssets}
                        position="absolute"
                        top={2}
                        right={2}
                      />
                    </Box>

                    {/* Asset Info */}
                    <Box w="100%">
                      <Text fontWeight="bold" noOfLines={1}>{asset.name}</Text>
                      <Text fontSize="sm" color="gray.600" noOfLines={2}>
                        {asset.description || "No description"}
                      </Text>

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
                        Type: {asset.file_type} • Size: {formatFileSize(asset.file_size)}
                      </Text>
                      <Text fontSize="xs" color="gray.500">
                        By: {asset.created_by_username}
                      </Text>
                    </Box>

                    {/* Actions */}
                    <Flex justify="space-between" w="100%" pt={2}>
                      <HStack>
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

                      <Badge colorScheme={asset.is_public ? "green" : "orange"}>
                        {asset.is_public ? "Public" : "Private"}
                      </Badge>
                    </Flex>
                  </VStack>
                </GridItem>
              );
            })}
          </Grid>
        ) : (
          // List View
          <Box bg="white" borderRadius="xl" boxShadow="sm" overflow="hidden">
            <Table variant="simple">
              <Thead bg="brand.200">
                <Tr>
                  <Th color="white">Preview</Th>
                  <Th color="white">Name</Th>
                  <Th color="white">Type</Th>
                  <Th color="white">Size</Th>
                  <Th color="white">Category</Th>
                  <Th color="white">Actions</Th>
                </Tr>
              </Thead>
              <Tbody>
                {assets.map((asset) => (
                  <Tr 
                    key={asset.id} 
                    _hover={{ bg: "brand.50" }} 
                    cursor="pointer" 
                    onClick={() => handlePreview(asset)}
                  >
                    <Td>
                      <Box w="50px" h="50px" borderRadius="md" overflow="hidden">
                        {getPreviewType(asset) === 'image' ? (
                          <Image 
                            src={getFullFileUrl(asset.file)} 
                            alt={asset.name} 
                            w="100%" 
                            h="100%" 
                            objectFit="cover" 
                          />
                        ) : (
                          <Flex bg="gray.200" w="100%" h="100%" align="center" justify="center">
                            <Text fontSize="xl">
                              {getPreviewType(asset) === 'video' ? '🎥' : 
                               getPreviewType(asset) === '3d' ? '🎯' : 
                               getPreviewType(asset) === 'pdf' ? '📄' : '📁'}
                            </Text>
                          </Flex>
                        )}
                      </Box>
                    </Td>
                    <Td fontWeight="medium">{asset.name}</Td>
                    <Td>
                      <Badge colorScheme={
                        asset.file_type === 'IMG' ? 'green' : 
                        asset.file_type === 'VID' ? 'red' : 
                        asset.file_type === 'DOC' ? 'blue' : 
                        asset.file_type === '3D' ? 'purple' : 'gray'
                      }>
                        {asset.file_type}
                      </Badge>
                    </Td>
                    <Td fontSize="sm">{formatFileSize(asset.file_size)}</Td>
                    <Td fontSize="sm">{asset.category || 'Uncategorized'}</Td>
                    <Td>
                      <HStack onClick={(e) => e.stopPropagation()}>
                        <Tooltip label="Download">
                          <IconButton
                            aria-label="Download"
                            icon={<DownloadIcon />}
                            size="sm"
                            variant="ghost"
                            as="a"
                            href={getFullFileUrl(asset.file)}
                            download
                          />
                        </Tooltip>
                        <FavoriteButton
                          assetId={asset.id}
                          isFavorited={asset.is_favorited}
                          onToggle={fetchAssets}
                          size="sm"
                        />
                      </HStack>
                    </Td>
                  </Tr>
                ))}
              </Tbody>
            </Table>
          </Box>
        )}

        {/* Enhanced Preview Modal with Fixed Favorite Button */}
        <Modal isOpen={isOpen} onClose={onClose} size="6xl" isCentered>
          <ModalOverlay />
          <ModalContent maxH="90vh" overflow="hidden">
            <ModalHeader 
              bg="white" 
              borderBottom="1px" 
              borderColor="gray.200" 
              p={4}
              pr={12} // Add padding to prevent overlap with close button
            >
              <Flex justify="space-between" align="center">
                <HStack spacing={3}>
                  <Text fontWeight="bold" fontSize="xl">{selectedAsset?.name}</Text>
                  <Badge colorScheme={
                    selectedAsset?.file_type === 'IMG' ? 'green' : 
                    selectedAsset?.file_type === 'VID' ? 'red' : 
                    selectedAsset?.file_type === 'DOC' ? 'blue' : 
                    selectedAsset?.file_type === '3D' ? 'purple' : 'gray'
                  }>
                    {selectedAsset?.file_type}
                  </Badge>
                  <Tooltip label={selectedAsset?.is_favorited ? "Remove from favorites" : "Add to favorites"}>
                    <IconButton
                      aria-label="Favorite"
                      icon={<StarIcon />}
                      size="sm"
                      variant="ghost"
                      color={selectedAsset?.is_favorited ? "yellow.500" : "gray.400"}
                      onClick={(e) => {
                        e.stopPropagation();
                        if (selectedAsset) {
                          // Trigger favorite toggle
                          const favoriteBtn = document.querySelector(`[data-asset-id="${selectedAsset.id}"]`);
                          if (favoriteBtn) {
                            (favoriteBtn as HTMLElement).click();
                          }
                        }
                      }}
                    />
                  </Tooltip>
                </HStack>
                <HStack spacing={2}>
                  <Tooltip label="Download">
                    <IconButton
                      aria-label="Download"
                      icon={<DownloadIcon />}
                      size="sm"
                      variant="ghost"
                      as="a"
                      href={selectedAsset ? getFullFileUrl(selectedAsset.file) : '#'}
                      download
                      onClick={(e) => e.stopPropagation()}
                    />
                  </Tooltip>
                  <Tooltip label="Open in new tab">
                    <IconButton
                      aria-label="Open in new tab"
                      icon={<ExternalLinkIcon />}
                      size="sm"
                      variant="ghost"
                      as="a"
                      href={selectedAsset ? getFullFileUrl(selectedAsset.file) : '#'}
                      target="_blank"
                      onClick={(e) => e.stopPropagation()}
                    />
                  </Tooltip>
                  {(role === "Admin" || role === "Editor") && (
                    <>
                      <Tooltip label="Edit">
                        <IconButton
                          aria-label="Edit"
                          icon={<EditIcon />}
                          size="sm"
                          variant="ghost"
                          onClick={(e) => {
                            e.stopPropagation();
                            setEditingAsset(selectedAsset);
                            onClose();
                          }}
                        />
                      </Tooltip>
                      <Tooltip label="Delete">
                        <IconButton
                          aria-label="Delete"
                          icon={<DeleteIcon />}
                          size="sm"
                          variant="ghost"
                          colorScheme="red"
                          onClick={(e) => {
                            e.stopPropagation();
                            if (selectedAsset) {
                              handleDeleteAsset(selectedAsset.id);
                              onClose();
                            }
                          }}
                        />
                      </Tooltip>
                    </>
                  )}
                </HStack>
              </Flex>
            </ModalHeader>
            <ModalCloseButton 
              size="md"
              position="absolute"
              right={3}
              top={3}
              bg="white"
              borderRadius="full"
              _hover={{ bg: "gray.100" }}
            />
            <ModalBody p={0} display="flex" maxH="70vh">
              {/* Preview Area */}
              <Box flex="1" bg="gray.900" display="flex" justifyContent="center" alignItems="center" p={4}>
                {selectedAsset && (() => {
                  const previewType = getPreviewType(selectedAsset);
                  const fullFileUrl = getFullFileUrl(selectedAsset.file);

                  switch (previewType) {
                    case 'image':
                      return (
                        <Image
                          src={fullFileUrl}
                          alt={selectedAsset.name}
                          maxH="65vh"
                          maxW="100%"
                          objectFit="contain"
                        />
                      );
                    case 'video':
                      return (
                        <Box w="100%" maxW="800px">
                          <video
                            src={fullFileUrl}
                            controls
                            autoPlay
                            style={{ width: '100%', maxHeight: '65vh', borderRadius: '8px' }}
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
                              <Text ml={3} color="white">Loading 3D Viewer...</Text>
                            </Flex>
                          }>
                            <BabylonViewer modelUrl={fullFileUrl} />
                          </Suspense>
                        </Box>
                      );
                    default:
                      return (
                        <Flex direction="column" align="center" justify="center" color="white">
                          <Text fontSize="xl" mb={4}>Preview not available</Text>
                          <Button
                            as="a"
                            href={fullFileUrl}
                            download
                            colorScheme="blue"
                            size="lg"
                          >
                            Download File
                          </Button>
                        </Flex>
                      );
                  }
                })()}
              </Box>

              {/* Details Panel */}
              <Box w="400px" bg="white" p={6} overflowY="auto">
                <VStack align="start" spacing={6}>
                  {/* Description */}
                  <Box w="100%">
                    <Text fontWeight="semibold" mb={2}>Description</Text>
                    <Text color="gray.700" fontSize="sm">
                      {selectedAsset?.description || "No description provided"}
                    </Text>
                  </Box>

                  {/* File Information */}
                  <Box w="100%">
                    <Text fontWeight="semibold" mb={3}>File Information</Text>
                    <VStack align="start" spacing={2} fontSize="sm">
                      <Flex justify="space-between" w="100%">
                        <Text color="gray.600">Size:</Text>
                        <Text fontWeight="medium">{selectedAsset ? formatFileSize(selectedAsset.file_size) : '0 MB'}</Text>
                      </Flex>
                      <Flex justify="space-between" w="100%">
                        <Text color="gray.600">Category:</Text>
                        <Badge colorScheme="blue">{selectedAsset?.category || 'Uncategorized'}</Badge>
                      </Flex>
                      <Flex justify="space-between" w="100%">
                        <Text color="gray.600">Uploaded by:</Text>
                        <Text fontWeight="medium">{selectedAsset?.created_by_username}</Text>
                      </Flex>
                      <Flex justify="space-between" w="100%">
                        <Text color="gray.600">Created:</Text>
                        <Text fontWeight="medium">{selectedAsset ? formatDate(selectedAsset.created_at) : ''}</Text>
                      </Flex>
                      <Flex justify="space-between" w="100%">
                        <Text color="gray.600">Visibility:</Text>
                        <Badge colorScheme={selectedAsset?.is_public ? "green" : "orange"}>
                          {selectedAsset?.is_public ? "Public" : "Private"}
                        </Badge>
                      </Flex>
                      <Flex justify="space-between" w="100%">
                        <Text color="gray.600">Favorites:</Text>
                        <HStack>
                          <StarIcon color="yellow.500" />
                          <Text fontWeight="medium">{selectedAsset?.favorites_count || 0}</Text>
                        </HStack>
                      </Flex>
                    </VStack>
                  </Box>

                  {/* Tags */}
                  {selectedAsset?.tags && selectedAsset.tags.length > 0 && (
                    <Box w="100%">
                      <Text fontWeight="semibold" mb={2}>Tags</Text>
                      <Flex wrap="wrap" gap={2}>
                        {selectedAsset.tags.map((tag, index) => (
                          <Badge key={index} colorScheme="blue" variant="subtle" borderRadius="full" px={3} py={1}>
                            {tag}
                          </Badge>
                        ))}
                      </Flex>
                    </Box>
                  )}

                  {/* Keywords */}
                  {selectedAsset?.keywords && (
                    <Box w="100%">
                      <Text fontWeight="semibold" mb={2}>Keywords</Text>
                      <Text color="gray.700" fontSize="sm">{selectedAsset.keywords}</Text>
                    </Box>
                  )}
                </VStack>
              </Box>
            </ModalBody>
          </ModalContent>
        </Modal>

        {/* Hidden FavoriteButton for functionality */}
        {selectedAsset && (
          <FavoriteButton
            assetId={selectedAsset.id}
            isFavorited={selectedAsset.is_favorited}
            onToggle={fetchAssets}
            style={{ display: 'none' }}
            data-asset-id={selectedAsset.id}
          />
        )}

        <ImageSearchModal
          isOpen={isImageSearchOpen}
          onClose={onImageSearchClose}
          onSelectAsset={(assetId) => {
            const asset = assets.find(a => a.id === assetId);
            if (asset) {
              setSelectedAsset(asset);
              onOpen();
            }
            onImageSearchClose();
          }}
        />

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