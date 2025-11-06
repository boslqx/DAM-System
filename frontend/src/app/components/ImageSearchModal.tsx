"use client";

import { useState, useRef } from "react";
import {
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalFooter,
  ModalBody,
  ModalCloseButton,
  Button,
  VStack,
  Box,
  Text,
  Image,
  Grid,
  GridItem,
  Badge,
  HStack,
  Icon,
  useToast,
  Progress,
} from "@chakra-ui/react";
import { FiUpload, FiImage } from "react-icons/fi";

interface SearchResult {
  id: number;
  name: string;
  file: string;
  file_type: string;
  similarity_score: number;
  thumbnail?: string;
}

interface ImageSearchModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectAsset?: (assetId: number) => void;
}

export default function ImageSearchModal({ 
  isOpen, 
  onClose, 
  onSelectAsset 
}: ImageSearchModalProps) {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string>("");
  const [searching, setSearching] = useState(false);
  const [results, setResults] = useState<SearchResult[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const toast = useToast();

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate image type
    if (!file.type.startsWith('image/')) {
      toast({
        title: "Invalid file type",
        description: "Please upload an image file",
        status: "error",
        duration: 3000,
      });
      return;
    }

    // Validate file size (optional - 10MB limit)
    if (file.size > 10 * 1024 * 1024) {
      toast({
        title: "File too large",
        description: "Please upload an image smaller than 10MB",
        status: "error",
        duration: 3000,
      });
      return;
    }

    setSelectedFile(file);
    
    // Generate preview
    const reader = new FileReader();
    reader.onloadend = () => {
      setPreviewUrl(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleSearch = async () => {
    if (!selectedFile) return;

    try {
      setSearching(true);
      setResults([]); // Clear previous results
      
      // Get token from localStorage
      const token = localStorage.getItem("token");
      if (!token) {
        throw new Error('Authentication required. Please log in again.');
      }

      const formData = new FormData();
      formData.append('image', selectedFile);

      console.log('🔍 Starting image search...', {
        file: selectedFile.name,
        size: selectedFile.size,
        type: selectedFile.type
      });

      const response = await fetch(
        'http://127.0.0.1:8000/api/assets/search_by_image/',
        {
          method: 'POST',
          headers: {
            'Authorization': `Token ${token}`,
            // Don't set Content-Type for FormData - let browser set it with boundary
          },
          body: formData,
        }
      );

      console.log('📡 Response status:', response.status);

      // Try to parse the response regardless of status
      let responseData;
      try {
        responseData = await response.json();
        console.log('📦 Response data:', responseData);
      } catch (parseError) {
        console.error('❌ Failed to parse response:', parseError);
        throw new Error('Invalid response from server');
      }

      if (!response.ok) {
        // Use the actual error message from backend if available
        const errorMessage = responseData?.error || responseData?.detail || `Server error: ${response.status}`;
        throw new Error(errorMessage);
      }

      setResults(responseData.results || []);

      if (responseData.results.length === 0) {
        toast({
          title: "No similar images found",
          description: "Try uploading a different image",
          status: "info",
          duration: 5000,
        });
      } else {
        toast({
          title: `Found ${responseData.results.length} similar image${responseData.results.length !== 1 ? 's' : ''}`,
          status: "success",
          duration: 3000,
        });
      }
    } catch (error: any) {
      console.error('🔴 Search error:', error);
      
      let errorMessage = 'Search failed, please try again';
      
      if (error.message) {
        errorMessage = error.message;
      }
      
      toast({
        title: "Search failed",
        description: errorMessage,
        status: "error",
        duration: 5000,
        isClosable: true,
      });
    } finally {
      setSearching(false);
    }
  };

  const getFullFileUrl = (fileUrl: string): string => {
    if (!fileUrl) return '/placeholder-image.jpg';
    if (fileUrl.startsWith('http')) return fileUrl;
    return `http://127.0.0.1:8000${fileUrl}`;
  };

  const getSimilarityColor = (score: number) => {
    if (score >= 90) return 'green';
    if (score >= 75) return 'blue';
    if (score >= 60) return 'yellow';
    return 'orange';
  };

  const handleReset = () => {
    setSelectedFile(null);
    setPreviewUrl("");
    setResults([]);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleClose = () => {
    handleReset();
    onClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={handleClose} size="6xl">
      <ModalOverlay />
      <ModalContent maxH="90vh" overflow="hidden">
        <ModalHeader>
          <VStack align="start" spacing={1}>
            <Text>Search by Image</Text>
            <Text fontSize="sm" color="gray.600" fontWeight="normal">
              Upload an image to find visually similar assets
            </Text>
          </VStack>
        </ModalHeader>
        <ModalCloseButton />
        
        <ModalBody overflow="auto">
          <VStack spacing={6} align="stretch">
            {/* Upload Section */}
            <Box>
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileSelect}
                accept="image/*"
                style={{ display: 'none' }}
              />

              {!previewUrl ? (
                <Box
                  onClick={() => fileInputRef.current?.click()}
                  p={12}
                  border="2px dashed"
                  borderColor="gray.300"
                  borderRadius="md"
                  textAlign="center"
                  cursor="pointer"
                  bg="gray.50"
                  _hover={{ bg: "gray.100", borderColor: "blue.300" }}
                  transition="all 0.2s"
                >
                  <VStack spacing={3}>
                    <Icon as={FiUpload} w={12} h={12} color="gray.400" />
                    <Text color="gray.700" fontWeight="medium">
                      Click to upload an image
                    </Text>
                    <Text fontSize="sm" color="gray.500">
                      JPG, PNG, GIF, WEBP supported (max 10MB)
                    </Text>
                  </VStack>
                </Box>
              ) : (
                <VStack spacing={4}>
                  <Box position="relative" textAlign="center">
                    <Text fontSize="sm" color="gray.600" mb={2}>
                      Selected Image:
                    </Text>
                    <Image
                      src={previewUrl}
                      alt="Search image"
                      maxH="300px"
                      maxW="100%"
                      borderRadius="md"
                      boxShadow="md"
                      objectFit="contain"
                    />
                  </Box>
                  <HStack spacing={3}>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => fileInputRef.current?.click()}
                      leftIcon={<Icon as={FiImage} />}
                      isDisabled={searching}
                    >
                      Choose Different Image
                    </Button>
                    <Button
                      size="sm"
                      colorScheme="blue"
                      onClick={handleSearch}
                      isLoading={searching}
                      loadingText="Searching..."
                      isDisabled={!selectedFile}
                    >
                      Search Similar Images
                    </Button>
                  </HStack>
                </VStack>
              )}
            </Box>

            {/* Loading Indicator */}
            {searching && (
              <Box>
                <Text mb={2} color="blue.600" fontWeight="medium">
                  Analyzing image and searching database...
                </Text>
                <Progress size="sm" isIndeterminate colorScheme="blue" />
                <Text fontSize="sm" color="gray.600" mt={2}>
                  This may take a few seconds...
                </Text>
              </Box>
            )}

            {/* Results Section */}
            {results.length > 0 && (
              <Box>
                <Text fontWeight="medium" mb={4} fontSize="lg">
                  Found {results.length} similar image{results.length !== 1 ? 's' : ''}
                </Text>
                
                <Grid templateColumns="repeat(auto-fill, minmax(200px, 1fr))" gap={4}>
                  {results.map((result) => (
                    <GridItem
                      key={result.id}
                      bg="white"
                      borderRadius="lg"
                      overflow="hidden"
                      boxShadow="sm"
                      border="1px solid"
                      borderColor="gray.200"
                      _hover={{ 
                        boxShadow: "md", 
                        transform: "translateY(-2px)",
                        cursor: onSelectAsset ? "pointer" : "default"
                      }}
                      transition="all 0.2s"
                      onClick={() => onSelectAsset?.(result.id)}
                    >
                      <Box position="relative">
                        <Image
                          src={getFullFileUrl(result.file)}
                          alt={result.name}
                          w="100%"
                          h="150px"
                          objectFit="cover"
                          fallback={
                            <Box 
                              w="100%" 
                              h="150px" 
                              bg="gray.100" 
                              display="flex" 
                              alignItems="center" 
                              justifyContent="center"
                            >
                              <Icon as={FiImage} w={8} h={8} color="gray.400" />
                            </Box>
                          }
                        />
                        <Badge
                          position="absolute"
                          top={2}
                          right={2}
                          colorScheme={getSimilarityColor(result.similarity_score)}
                          fontSize="xs"
                          borderRadius="full"
                          px={2}
                        >
                          {result.similarity_score}% match
                        </Badge>
                      </Box>
                      <Box p={3}>
                        <Text fontSize="sm" fontWeight="medium" noOfLines={1} mb={1}>
                          {result.name}
                        </Text>
                        <Text fontSize="xs" color="gray.600" noOfLines={1}>
                          Type: {result.file_type}
                        </Text>
                      </Box>
                    </GridItem>
                  ))}
                </Grid>
              </Box>
            )}
          </VStack>
        </ModalBody>

        <ModalFooter>
          <Button variant="ghost" mr={3} onClick={handleReset} isDisabled={searching}>
            Reset
          </Button>
          <Button onClick={handleClose} isDisabled={searching}>
            Close
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
}