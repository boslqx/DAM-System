"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  Box,
  Flex,
  Heading,
  FormControl,
  FormLabel,
  FormHelperText,
  Input,
  Textarea,
  Select,
  Button,
  VStack,
  Text,
  Badge,
  Image,
  Icon,
  Switch,
  Divider,
  Grid,
  useToast,
  HStack,
  Spinner,
} from "@chakra-ui/react";
import { FiUpload, FiFile, FiImage, FiVideo, FiBox } from "react-icons/fi";
import Sidebar from "@/components/Sidebar";

type AssetFormData = {
  name: string;
  description: string;
  category: string;
  tags: string;
  keywords: string;
  is_public: boolean;
};

export default function RegisterAssetPage() {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string>("");
  const [uploading, setUploading] = useState(false);
  const [formData, setFormData] = useState<AssetFormData>({
    name: "",
    description: "",
    category: "",
    tags: "",
    keywords: "",
    is_public: true,
  });
  
  const toast = useToast();
  const router = useRouter();

  // Determine file type based on extension and MIME type
  const getFileType = (file: File): string => {
    const ext = file.name.split('.').pop()?.toLowerCase() || '';
    const mimeType = file.type.toLowerCase();

    // 3D Models
    if (['glb', 'gltf', 'obj', 'fbx', 'stl', 'dae', '3ds'].includes(ext)) {
      return '3D';
    }
    // Images
    if (mimeType.startsWith('image/') || ['jpg', 'jpeg', 'png', 'gif', 'webp', 'bmp', 'svg'].includes(ext)) {
      return 'IMG';
    }
    // Videos
    if (mimeType.startsWith('video/') || ['mp4', 'mov', 'avi', 'webm', 'mkv', 'wmv'].includes(ext)) {
      return 'VID';
    }
    // Documents
    if (['pdf', 'doc', 'docx', 'txt', 'xls', 'xlsx', 'ppt', 'pptx', 'csv'].includes(ext)) {
      return 'DOC';
    }
    // Other
    return 'OTH';
  };

  // Get file type icon and color
  const getFileTypeInfo = (fileType: string) => {
    switch (fileType) {
      case '3D':
        return { icon: FiBox, color: 'purple', label: '3D Model' };
      case 'IMG':
        return { icon: FiImage, color: 'green', label: 'Image' };
      case 'VID':
        return { icon: FiVideo, color: 'red', label: 'Video' };
      case 'DOC':
        return { icon: FiFile, color: 'blue', label: 'Document' };
      default:
        return { icon: FiFile, color: 'gray', label: 'File' };
    }
  };

  // Handle file selection
  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file size (max 100MB)
    const maxSize = 100 * 1024 * 1024;
    if (file.size > maxSize) {
      toast({
        title: "File too large",
        description: "Maximum file size is 100MB",
        status: "error",
        duration: 4000,
        isClosable: true,
      });
      return;
    }

    setSelectedFile(file);

    // Generate preview for images
    if (file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setPreviewUrl(reader.result as string);
      };
      reader.readAsDataURL(file);
    } else {
      setPreviewUrl("");
    }

    // Auto-populate name if empty
    if (!formData.name.trim()) {
      const nameWithoutExt = file.name.replace(/\.[^/.]+$/, "");
      setFormData(prev => ({ ...prev, name: nameWithoutExt }));
    }

    // Auto-set category based on file type
    const fileType = getFileType(file);
    if (!formData.category) {
      const categoryMap: { [key: string]: string } = {
        '3D': '3D Models',
        'IMG': 'Images',
        'VID': 'Videos',
        'DOC': 'Documents',
        'OTH': 'Other'
      };
      setFormData(prev => ({ ...prev, category: categoryMap[fileType] || 'Other' }));
    }
  };

  // Handle drag and drop
  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file) {
      // Create a proper FileList-like object
      const dataTransfer = new DataTransfer();
      dataTransfer.items.add(file);
      
      // Create a proper input change event
      const inputEvent = {
        target: {
          files: dataTransfer.files
        }
      } as React.ChangeEvent<HTMLInputElement>;
      
      handleFileSelect(inputEvent);
    }
  }, []);

  // Upload handler
  const handleUpload = async () => {
    if (!selectedFile) {
      toast({
        title: "No file selected",
        description: "Please select a file to upload",
        status: "warning",
        duration: 3000,
        isClosable: true,
      });
      return;
    }

    if (!formData.name.trim()) {
      toast({
        title: "Name required",
        description: "Please enter an asset name",
        status: "warning",
        duration: 3000,
        isClosable: true,
      });
      return;
    }

    try {
      setUploading(true);
      const token = localStorage.getItem("token");

      if (!token) {
        toast({
          title: "Authentication required",
          description: "Please log in to upload assets",
          status: "error",
          duration: 3000,
          isClosable: true,
        });
        router.push("/login");
        return;
      }

      // STEP 1: Upload the file first
      const fileFormData = new FormData();
      fileFormData.append('file', selectedFile);
      
      // Convert tags to array
      const tagsArray = formData.tags && formData.tags.trim() 
        ? formData.tags.split(',').map(tag => tag.trim()).filter(Boolean)
        : [];
      
      // Add all other fields as form data
      fileFormData.append('name', formData.name);
      fileFormData.append('description', formData.description);
      fileFormData.append('category', formData.category);
      fileFormData.append('file_type', getFileType(selectedFile));
      fileFormData.append('file_size', selectedFile.size.toString());
      fileFormData.append('is_public', formData.is_public.toString());
      fileFormData.append('keywords', formData.keywords || '');
      
      // Send tags as individual array items
      if (tagsArray.length > 0) {
        fileFormData.append('tags', JSON.stringify(tagsArray)); // send as JSON array
      } else {
        fileFormData.append('tags', '[]');
      }

      console.log("Uploading to:", "http://127.0.0.1:8000/api/assets/");
      console.log("=== FormData Contents ===");
      for (let pair of fileFormData.entries()) {
        console.log(pair[0], ':', pair[1]);
      }

      const res = await fetch("http://127.0.0.1:8000/api/assets/", {
        method: "POST",
        headers: {
          Authorization: `Token ${token}`,
        },
        body: fileFormData,
      });

      const responseText = await res.text();
      console.log("Response status:", res.status);
      console.log("Response text:", responseText);

      let data;
      try {
        data = JSON.parse(responseText);
      } catch (parseError) {
        console.error("Failed to parse response as JSON:", parseError);
        if (responseText.includes('<!DOCTYPE') || responseText.includes('<html')) {
          throw new Error("Server returned an HTML error page. Check if the API endpoint is correct.");
        } else {
          throw new Error(`Server returned unexpected response: ${responseText.substring(0, 100)}...`);
        }
      }

      if (!res.ok) {
        console.error("=== VALIDATION ERROR ===");
        console.error("Full response:", JSON.stringify(data, null, 2));
        throw new Error(data.detail || data.error || data.message || `HTTP error! status: ${res.status}`);
      }

      toast({
        title: "Asset uploaded successfully!",
        description: `${formData.name} has been registered`,
        status: "success",
        duration: 4000,
        isClosable: true,
      });

      // Reset form
      setSelectedFile(null);
      setPreviewUrl("");
      setFormData({
        name: "",
        description: "",
        category: "",
        tags: "",
        keywords: "",
        is_public: true,
      });

      setTimeout(() => {
        router.push("/dashboard");
      }, 1500);

    } catch (err: any) {
      console.error("Upload error:", err);
      
      toast({
        title: "Upload failed",
        description: err.message || "Please try again",
        status: "error",
        duration: 5000,
        isClosable: true,
      });
    } finally {
      setUploading(false);
    }
  };

  const fileTypeInfo = selectedFile ? getFileTypeInfo(getFileType(selectedFile)) : null;

  return (
    <Flex>
      <Sidebar />
      <Box flex="1" p={8} bg="gray.50" minH="100vh" ml={{ base: "0", md: "60px" }}>
        <Heading mb={6} color="gray.700">Register New Asset</Heading>
        
        <Grid templateColumns={{ base: "1fr", lg: "1fr 400px" }} gap={6}>
          {/* Left Column - Form */}
          <Box bg="white" p={6} borderRadius="xl" boxShadow="sm">
            <Heading size="md" mb={4} color="gray.700">Asset Information</Heading>
            
            {/* File Upload Area */}
            <Box mb={4}>
              <FormLabel>Upload File</FormLabel>
              <Input
                type="file"
                display="none"
                id="file-upload"
                onChange={handleFileSelect}
                accept="*/*"
              />
              <Box
                as="label"
                htmlFor="file-upload"
                p={12}
                border="2px dashed"
                borderColor={selectedFile ? "green.400" : "gray.300"}
                borderRadius="md"
                textAlign="center"
                cursor="pointer"
                bg={selectedFile ? "green.50" : "gray.50"}
                _hover={{ bg: selectedFile ? "green.100" : "gray.100", borderColor: "blue.400" }}
                onDrop={handleDrop}
                onDragOver={(e: React.DragEvent) => {
                  e.preventDefault(); // Only prevent default for dragOver
                }}
                display="flex"
                flexDirection="column"
                justifyContent="center"
                minH="200px"
              >
                {previewUrl ? (
                  <VStack>
                    <Image 
                      src={previewUrl} 
                      alt="Preview" 
                      maxH="200px" 
                      mx="auto" 
                      borderRadius="md"
                    />
                    <Text fontSize="sm" color="gray.600">
                      Click to change file
                    </Text>
                  </VStack>
                ) : selectedFile ? (
                  <VStack>
                    <Icon as={fileTypeInfo?.icon} w={12} h={12} color={`${fileTypeInfo?.color}.500`} />
                    <Text fontWeight="medium" color="gray.700">
                      {selectedFile.name}
                    </Text>
                    <Badge colorScheme={fileTypeInfo?.color}>
                      {fileTypeInfo?.label}
                    </Badge>
                    <Text fontSize="sm" color="gray.500">
                      {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
                    </Text>
                    <Text fontSize="sm" color="gray.600">
                      Click to change file
                    </Text>
                  </VStack>
                ) : (
                  <VStack spacing={3}>
                    <Icon as={FiUpload} w={12} h={12} color="gray.400" />
                    <VStack spacing={1}>
                      <Text color="gray.600" fontWeight="medium">
                        Click to upload or drag and drop
                      </Text>
                      <Text fontSize="sm" color="gray.500">
                        Supports all file types • Max 100MB
                      </Text>
                    </VStack>
                  </VStack>
                )}
              </Box>
            </Box>

            {/* Category Dropdown */}
            <FormControl mb={4}>
              <FormLabel>Category</FormLabel>
              <Select
                placeholder="Select a category"
                value={formData.category}
                onChange={(e) => setFormData({ ...formData, category: e.target.value })}
              >
                <option value="3D Models">3D Models</option>
                <option value="Images">Images</option>
                <option value="Videos">Videos</option>
                <option value="Documents">Documents</option>
                <option value="Other">Other</option>
              </Select>
            </FormControl>

            {/* Asset Name */}
            <FormControl mb={4} isRequired>
              <FormLabel>Asset Name</FormLabel>
              <Input
                placeholder="e.g. Product Mockup, Logo Design"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              />
            </FormControl>

            {/* Description */}
            <FormControl mb={4}>
              <FormLabel>Description</FormLabel>
              <Textarea
                placeholder="Brief description of the asset..."
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                rows={4}
              />
            </FormControl>

            {/* Tags */}
            <FormControl mb={4}>
              <FormLabel>Tags</FormLabel>
              <Input
                placeholder="e.g. design, mockup, product (comma-separated)"
                value={formData.tags}
                onChange={(e) => setFormData({ ...formData, tags: e.target.value })}
              />
              <FormHelperText>Separate tags with commas</FormHelperText>
            </FormControl>

            {/* Keywords */}
            <FormControl mb={4}>
              <FormLabel>Keywords</FormLabel>
              <Input
                placeholder="Search keywords..."
                value={formData.keywords}
                onChange={(e) => setFormData({ ...formData, keywords: e.target.value })}
              />
            </FormControl>

            {/* Public/Private Toggle */}
            <FormControl display="flex" alignItems="center" mb={6}>
              <FormLabel mb="0">Make Public</FormLabel>
              <Switch
                isChecked={formData.is_public}
                onChange={(e) => setFormData({ ...formData, is_public: e.target.checked })}
              />
            </FormControl>

            {/* Action Buttons */}
            <Flex gap={3}>
              <Button
                colorScheme="blue"
                leftIcon={<Icon as={FiUpload} />}
                onClick={handleUpload}
                isLoading={uploading}
                loadingText="Uploading..."
                flex="1"
                isDisabled={!selectedFile}
              >
                Save Asset
              </Button>
              <Button
                colorScheme="gray"
                variant="outline"
                onClick={() => {
                  setSelectedFile(null);
                  setPreviewUrl("");
                  setFormData({
                    name: "",
                    description: "",
                    category: "",
                    tags: "",
                    keywords: "",
                    is_public: true,
                  });
                }}
              >
                Clear
              </Button>
            </Flex>
          </Box>

          {/* Right Column - Preview/Info */}
          <Box bg="white" p={6} borderRadius="xl" boxShadow="sm" height="fit-content">
            <Heading size="md" mb={4} color="gray.700">File Information</Heading>
            {selectedFile ? (
              <VStack align="stretch" spacing={4}>
                <Flex justify="space-between" align="center">
                  <Text color="gray.600">File Name:</Text>
                  <Text fontWeight="medium" maxW="200px" isTruncated>
                    {selectedFile.name}
                  </Text>
                </Flex>
                
                <Flex justify="space-between">
                  <Text color="gray.600">File Type:</Text>
                  <Badge colorScheme={fileTypeInfo?.color}>
                    {fileTypeInfo?.label}
                  </Badge>
                </Flex>
                
                <Flex justify="space-between">
                  <Text color="gray.600">Size:</Text>
                  <Text>{(selectedFile.size / 1024 / 1024).toFixed(2)} MB</Text>
                </Flex>
                
                <Flex justify="space-between">
                  <Text color="gray.600">MIME Type:</Text>
                  <Text fontSize="sm" fontFamily="mono">
                    {selectedFile.type || "unknown"}
                  </Text>
                </Flex>
                
                <Divider />
                
                <Box>
                  <Text color="gray.600" mb={2}>Supported 3D Formats:</Text>
                  <HStack spacing={2} flexWrap="wrap">
                    {['GLB', 'GLTF', 'OBJ', 'FBX', 'STL'].map(format => (
                      <Badge key={format} colorScheme="purple" variant="subtle">
                        {format}
                      </Badge>
                    ))}
                  </HStack>
                </Box>
              </VStack>
            ) : (
              <VStack spacing={4} py={8}>
                <Icon as={FiFile} w={12} h={12} color="gray.300" />
                <Text color="gray.500" textAlign="center">
                  No file selected
                </Text>
                <Text fontSize="sm" color="gray.400" textAlign="center">
                  Upload a file to see details
                </Text>
              </VStack>
            )}
          </Box>
        </Grid>
      </Box>
    </Flex>
  );
}