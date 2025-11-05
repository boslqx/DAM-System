"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  Box,
  Flex,
  Heading,
  FormControl,
  FormLabel,
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
  Grid,
  useToast,
  HStack,
  Wrap,
  WrapItem,
  Tag,
  TagLabel,
  TagCloseButton,
  Progress,
  InputGroup,
  InputRightElement,
  Collapse,
  useDisclosure,
  ScaleFade,
  Container,
  Card,
  CardBody,
} from "@chakra-ui/react";
import { 
  FiUpload, 
  FiFile, 
  FiImage, 
  FiVideo, 
  FiBox, 
  FiCheck,
  FiX,
  FiPlus,
  FiChevronDown,
  FiChevronUp,
  FiInfo,
  FiAlertCircle,
  FiSave
} from "react-icons/fi";
import Sidebar from "@/components/Sidebar";
import { motion, AnimatePresence } from "framer-motion";

const MotionBox = motion.create(Box);
const MotionFlex = motion.create(Flex);

type AssetFormData = {
  name: string;
  description: string;
  category: string;
  tags: string[];
  keywords: string;
  is_public: boolean;
};

export default function RegisterAssetPage() {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string>("");
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [currentStep, setCurrentStep] = useState(1);
  const [isDragging, setIsDragging] = useState(false);
  const [newTag, setNewTag] = useState("");
  const [formData, setFormData] = useState<AssetFormData>({
    name: "",
    description: "",
    category: "",
    tags: [],
    keywords: "",
    is_public: true,
  });
  
  const toast = useToast();
  const router = useRouter();
  const { isOpen: showAdvanced, onToggle: toggleAdvanced } = useDisclosure();

  const categories = [
    { value: "3D Models", icon: FiBox, color: "purple.500", emoji: "🎯" },
    { value: "Images", icon: FiImage, color: "green.500", emoji: "🖼️" },
    { value: "Videos", icon: FiVideo, color: "red.500", emoji: "🎬" },
    { value: "Documents", icon: FiFile, color: "blue.500", emoji: "📄" },
    { value: "Other", icon: FiFile, color: "gray.500", emoji: "📦" },
  ];

  const getFileType = (file: File): string => {
    const ext = file.name.split('.').pop()?.toLowerCase() || '';
    const mimeType = file.type.toLowerCase();

    if (['glb', 'gltf', 'obj', 'fbx', 'stl', 'dae', '3ds'].includes(ext)) return '3D';
    if (mimeType.startsWith('image/') || ['jpg', 'jpeg', 'png', 'gif', 'webp', 'bmp', 'svg'].includes(ext)) return 'IMG';
    if (mimeType.startsWith('video/') || ['mp4', 'mov', 'avi', 'webm', 'mkv', 'wmv'].includes(ext)) return 'VID';
    if (['pdf', 'doc', 'docx', 'txt', 'xls', 'xlsx', 'ppt', 'pptx', 'csv'].includes(ext)) return 'DOC';
    return 'OTH';
  };

  const getFileTypeInfo = (fileType: string) => {
    switch (fileType) {
      case '3D': return { icon: FiBox, color: 'purple', label: '3D Model', gradient: 'linear(to-r, purple.400, pink.400)' };
      case 'IMG': return { icon: FiImage, color: 'green', label: 'Image', gradient: 'linear(to-r, green.400, teal.400)' };
      case 'VID': return { icon: FiVideo, color: 'red', label: 'Video', gradient: 'linear(to-r, red.400, orange.400)' };
      case 'DOC': return { icon: FiFile, color: 'blue', label: 'Document', gradient: 'linear(to-r, blue.400, cyan.400)' };
      default: return { icon: FiFile, color: 'gray', label: 'File', gradient: 'linear(to-r, gray.400, gray.500)' };
    }
  };

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

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

    if (file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setPreviewUrl(reader.result as string);
      };
      reader.readAsDataURL(file);
    } else {
      setPreviewUrl("");
    }

    if (!formData.name.trim()) {
      const nameWithoutExt = file.name.replace(/\.[^/.]+$/, "");
      setFormData(prev => ({ ...prev, name: nameWithoutExt }));
    }

    const fileType = getFileType(file);
    if (!formData.category) {
      const categoryMap: { [key: string]: string } = {
        '3D': '3D Models', 'IMG': 'Images', 'VID': 'Videos', 'DOC': 'Documents', 'OTH': 'Other'
      };
      setFormData(prev => ({ ...prev, category: categoryMap[fileType] || 'Other' }));
    }

    setCurrentStep(2);
  };

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) {
      const dataTransfer = new DataTransfer();
      dataTransfer.items.add(file);
      const inputEvent = {
        target: { files: dataTransfer.files }
      } as React.ChangeEvent<HTMLInputElement>;
      handleFileSelect(inputEvent);
    }
  }, []);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const addTag = () => {
    if (newTag.trim() && !formData.tags.includes(newTag.trim())) {
      setFormData(prev => ({ ...prev, tags: [...prev.tags, newTag.trim()] }));
      setNewTag("");
    }
  };

  const removeTag = (tagToRemove: string) => {
    setFormData(prev => ({ ...prev, tags: prev.tags.filter(tag => tag !== tagToRemove) }));
  };

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
      setUploadProgress(0);

      // Simulate upload progress
      const progressInterval = setInterval(() => {
        setUploadProgress(prev => {
          if (prev >= 90) {
            clearInterval(progressInterval);
            return prev;
          }
          return prev + 10;
        });
      }, 200);

      const token = localStorage.getItem("token");

      if (!token) {
        clearInterval(progressInterval);
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

      const fileFormData = new FormData();
      fileFormData.append('file', selectedFile);
      fileFormData.append('name', formData.name);
      fileFormData.append('description', formData.description);
      fileFormData.append('category', formData.category);
      fileFormData.append('file_type', getFileType(selectedFile));
      fileFormData.append('file_size', selectedFile.size.toString());
      fileFormData.append('is_public', formData.is_public.toString());
      fileFormData.append('keywords', formData.keywords || '');
      
      if (formData.tags.length > 0) {
        formData.tags.forEach((tag) => fileFormData.append('tags[]', tag));
      }

      const res = await fetch("http://127.0.0.1:8000/api/assets/", {
        method: "POST",
        headers: {
          Authorization: `Token ${token}`,
        },
        body: fileFormData,
      });

      clearInterval(progressInterval);
      setUploadProgress(100);

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Upload failed');
      }

      toast({
        title: "Success! 🎉",
        description: `${formData.name} has been uploaded`,
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
        tags: [],
        keywords: "",
        is_public: true,
      });
      setCurrentStep(1);
      setUploadProgress(0);

      setTimeout(() => {
        router.push("/dashboard");
      }, 1500);

    } catch (err: any) {
      console.error("Upload error:", err);
      setUploadProgress(0);
      
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
      <Box 
        flex="1" 
        minH="100vh" 
        ml={{ base: "0", md: "60px" }}
        bgGradient="linear(to-br, brand.50, white, brand.100)"
        position="relative"
        overflow="hidden"
      >
        {/* Animated Background Elements */}
        <Box
          position="absolute"
          top="-10%"
          right="-5%"
          w="500px"
          h="500px"
          borderRadius="full"
          bgGradient="linear(to-br, brand.200, brand.300)"
          opacity="0.1"
          filter="blur(80px)"
          zIndex="0"
        />
        <Box
          position="absolute"
          bottom="-10%"
          left="-5%"
          w="400px"
          h="400px"
          borderRadius="full"
          bgGradient="linear(to-tr, blue.200, purple.200)"
          opacity="0.1"
          filter="blur(80px)"
          zIndex="0"
        />

        <Container maxW="7xl" py={8} position="relative" zIndex="1">
          {/* Header */}
          <MotionBox
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            mb={8}
          >
            <Flex justify="space-between" align="center" mb={2}>
              <VStack align="start" spacing={1}>
                <Heading 
                  bgGradient="linear(to-r, brand.200, purple.500)" 
                  bgClip="text"
                  fontSize="4xl"
                  fontWeight="black"
                >
                  Upload New Asset
                </Heading>
                <Text color="gray.600" fontSize="lg">
                  Share your creative work with the team
                </Text>
              </VStack>
              
              {/* Step Indicator */}
              <HStack spacing={3}>
                <Flex align="center">
                  <Circle step={1} current={currentStep} label="Upload" />
                  <Divider w="50px" />
                  <Circle step={2} current={currentStep} label="Details" />
                  <Divider w="50px" />
                  <Circle step={3} current={currentStep >= 2 ? 3 : currentStep} label="Done" />
                </Flex>
              </HStack>
            </Flex>
          </MotionBox>

          <Grid templateColumns={{ base: "1fr", lg: "2fr 1fr" }} gap={6}>
            {/* Main Upload Area */}
            <VStack spacing={6} align="stretch">
              {/* File Upload Card */}
              <MotionBox
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.1 }}
              >
                <Card
                  bg="white"
                  borderRadius="2xl"
                  boxShadow="xl"
                  border="1px"
                  borderColor="gray.100"
                  overflow="hidden"
                >
                  <CardBody p={0}>
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
                      cursor="pointer"
                      position="relative"
                      minH="350px"
                      display="flex"
                      alignItems="center"
                      justifyContent="center"
                      onDrop={handleDrop}
                      onDragOver={handleDragOver}
                      onDragLeave={handleDragLeave}
                      bgGradient={isDragging 
                        ? "linear(to-br, brand.100, blue.100)" 
                        : selectedFile 
                        ? "linear(to-br, white, gray.50)"
                        : "linear(to-br, gray.50, white)"
                      }
                      transition="all 0.3s"
                      _hover={{
                        transform: "scale(1.01)",
                        boxShadow: "lg"
                      }}
                    >
                      <AnimatePresence mode="wait">
                        {previewUrl ? (
                          <MotionBox
                            key="preview"
                            initial={{ opacity: 0, scale: 0.9 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.9 }}
                            w="full"
                            h="full"
                            position="relative"
                          >
                            <Image 
                              src={previewUrl} 
                              alt="Preview" 
                              maxH="350px" 
                              w="full"
                              objectFit="contain"
                              p={4}
                            />
                            <Badge
                              position="absolute"
                              top={4}
                              right={4}
                              colorScheme={fileTypeInfo?.color}
                              fontSize="sm"
                              px={3}
                              py={1}
                              borderRadius="full"
                            >
                              {fileTypeInfo?.label}
                            </Badge>
                          </MotionBox>
                        ) : selectedFile ? (
                          <MotionFlex
                            key="file-info"
                            initial={{ opacity: 0, scale: 0.9 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.9 }}
                            direction="column"
                            align="center"
                            gap={4}
                            p={8}
                          >
                            <Box
                              p={6}
                              borderRadius="full"
                              bgGradient={fileTypeInfo?.gradient}
                            >
                              <Icon as={fileTypeInfo?.icon} w={16} h={16} color="white" />
                            </Box>
                            <VStack spacing={2}>
                              <Text fontWeight="bold" fontSize="xl" color="gray.700">
                                {selectedFile.name}
                              </Text>
                              <Badge colorScheme={fileTypeInfo?.color} fontSize="md" px={3} py={1}>
                                {fileTypeInfo?.label}
                              </Badge>
                              <Text fontSize="sm" color="gray.500">
                                {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
                              </Text>
                            </VStack>
                            <Text fontSize="sm" color="gray.600" mt={4}>
                              Click or drag to change file
                            </Text>
                          </MotionFlex>
                        ) : (
                          <MotionFlex
                            key="upload-prompt"
                            initial={{ opacity: 0, scale: 0.9 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.9 }}
                            direction="column"
                            align="center"
                            gap={4}
                            p={8}
                          >
                            <Box
                              p={8}
                              borderRadius="full"
                              bgGradient="linear(to-br, brand.200, purple.400)"
                              boxShadow="lg"
                            >
                              <Icon as={FiUpload} w={16} h={16} color="white" />
                            </Box>
                            <VStack spacing={2}>
                              <Text fontWeight="bold" fontSize="2xl" color="gray.700">
                                Drop your file here
                              </Text>
                              <Text color="gray.500" fontSize="lg">
                                or click to browse
                              </Text>
                            </VStack>
                            <HStack spacing={2} mt={4}>
                              {categories.map((cat) => (
                                <Badge
                                  key={cat.value}
                                  colorScheme={cat.color.split('.')[0]}
                                  fontSize="xs"
                                  px={2}
                                  py={1}
                                >
                                  {cat.emoji} {cat.value}
                                </Badge>
                              ))}
                            </HStack>
                            <Text fontSize="sm" color="gray.400" mt={2}>
                              Maximum file size: 100MB
                            </Text>
                          </MotionFlex>
                        )}
                      </AnimatePresence>
                    </Box>
                  </CardBody>
                </Card>
              </MotionBox>

              {/* Form Fields */}
              <AnimatePresence>
                {selectedFile && (
                  <MotionBox
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -20 }}
                  >
                    <Card
                      bg="white"
                      borderRadius="2xl"
                      boxShadow="xl"
                      border="1px"
                      borderColor="gray.100"
                    >
                      <CardBody p={6}>
                        <VStack spacing={5} align="stretch">
                          {/* Category Selection */}
                          <FormControl>
                            <FormLabel fontWeight="semibold" color="gray.700">
                              Category
                            </FormLabel>
                            <Grid templateColumns="repeat(5, 1fr)" gap={3}>
                              {categories.map((cat) => (
                                <Box
                                  key={cat.value}
                                  p={4}
                                  borderRadius="xl"
                                  border="2px"
                                  borderColor={formData.category === cat.value ? cat.color : "gray.200"}
                                  bg={formData.category === cat.value ? `${cat.color.split('.')[0]}.50` : "white"}
                                  cursor="pointer"
                                  onClick={() => setFormData({ ...formData, category: cat.value })}
                                  transition="all 0.2s"
                                  _hover={{ transform: "translateY(-2px)", boxShadow: "md" }}
                                  textAlign="center"
                                >
                                  <Text fontSize="2xl" mb={1}>{cat.emoji}</Text>
                                  <Text fontSize="xs" fontWeight="medium" color="gray.600">
                                    {cat.value.split(' ')[0]}
                                  </Text>
                                </Box>
                              ))}
                            </Grid>
                          </FormControl>

                          {/* Asset Name */}
                          <FormControl isRequired>
                            <FormLabel fontWeight="semibold" color="gray.700">
                              Asset Name
                            </FormLabel>
                            <Input
                              value={formData.name}
                              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                              placeholder="Give your asset a memorable name..."
                              size="lg"
                              borderRadius="xl"
                              borderColor="gray.200"
                              _hover={{ borderColor: "brand.200" }}
                              _focus={{ borderColor: "brand.200", boxShadow: "0 0 0 1px var(--chakra-colors-brand-200)" }}
                            />
                          </FormControl>

                          {/* Description */}
                          <FormControl>
                            <FormLabel fontWeight="semibold" color="gray.700">
                              Description
                            </FormLabel>
                            <Textarea
                              value={formData.description}
                              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                              placeholder="Describe what makes this asset special..."
                              rows={4}
                              borderRadius="xl"
                              borderColor="gray.200"
                              _hover={{ borderColor: "brand.200" }}
                              _focus={{ borderColor: "brand.200", boxShadow: "0 0 0 1px var(--chakra-colors-brand-200)" }}
                            />
                          </FormControl>

                          {/* Tags */}
                          <FormControl>
                            <FormLabel fontWeight="semibold" color="gray.700">
                              Tags
                            </FormLabel>
                            <InputGroup size="lg">
                              <Input
                                value={newTag}
                                onChange={(e) => setNewTag(e.target.value)}
                                onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addTag())}
                                placeholder="Add tags to organize your asset..."
                                borderRadius="xl"
                                borderColor="gray.200"
                                _hover={{ borderColor: "brand.200" }}
                                _focus={{ borderColor: "brand.200", boxShadow: "0 0 0 1px var(--chakra-colors-brand-200)" }}
                              />
                              <InputRightElement width="4.5rem">
                                <Button
                                  h="1.75rem"
                                  size="sm"
                                  onClick={addTag}
                                  colorScheme="brand"
                                  borderRadius="lg"
                                >
                                  <Icon as={FiPlus} />
                                </Button>
                              </InputRightElement>
                            </InputGroup>
                            
                            {formData.tags.length > 0 && (
                              <Wrap mt={3}>
                                {formData.tags.map((tag, index) => (
                                  <WrapItem key={index}>
                                    <Tag
                                      size="lg"
                                      borderRadius="full"
                                      variant="solid"
                                      colorScheme="brand"
                                    >
                                      <TagLabel>{tag}</TagLabel>
                                      <TagCloseButton onClick={() => removeTag(tag)} />
                                    </Tag>
                                  </WrapItem>
                                ))}
                              </Wrap>
                            )}
                          </FormControl>

                          {/* Advanced Options */}
                          <Box>
                            <Button
                              variant="ghost"
                              onClick={toggleAdvanced}
                              rightIcon={<Icon as={showAdvanced ? FiChevronUp : FiChevronDown} />}
                              w="full"
                              justifyContent="space-between"
                            >
                              Advanced Options
                            </Button>
                            
                            <Collapse in={showAdvanced} animateOpacity>
                              <VStack spacing={4} mt={4} p={4} bg="gray.50" borderRadius="xl">
                                <FormControl>
                                  <FormLabel fontSize="sm" fontWeight="semibold" color="gray.700">
                                    Keywords (SEO)
                                  </FormLabel>
                                  <Input
                                    value={formData.keywords}
                                    onChange={(e) => setFormData({ ...formData, keywords: e.target.value })}
                                    placeholder="Comma-separated keywords..."
                                    size="md"
                                    borderRadius="lg"
                                  />
                                </FormControl>

                                <FormControl display="flex" alignItems="center" justifyContent="space-between">
                                  <HStack>
                                    <Icon as={FiInfo} color="blue.500" />
                                    <FormLabel mb="0" fontSize="sm" fontWeight="semibold">
                                      Make this asset public
                                    </FormLabel>
                                  </HStack>
                                  <Switch
                                    isChecked={formData.is_public}
                                    onChange={(e) => setFormData({ ...formData, is_public: e.target.checked })}
                                    colorScheme="brand"
                                    size="lg"
                                  />
                                </FormControl>
                              </VStack>
                            </Collapse>
                          </Box>
                        </VStack>
                      </CardBody>
                    </Card>
                  </MotionBox>
                )}
              </AnimatePresence>

              {/* Upload Progress */}
              <AnimatePresence>
                {uploading && (
                  <MotionBox
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -20 }}
                  >
                    <Card bg="white" borderRadius="2xl" boxShadow="xl">
                      <CardBody>
                        <VStack spacing={3}>
                          <Text fontWeight="semibold">Uploading your asset...</Text>
                          <Progress
                            value={uploadProgress}
                            size="lg"
                            colorScheme="brand"
                            borderRadius="full"
                            w="full"
                            hasStripe
                            isAnimated
                          />
                          <Text fontSize="sm" color="gray.600">{uploadProgress}% Complete</Text>
                        </VStack>
                      </CardBody>
                    </Card>
                  </MotionBox>
                )}
              </AnimatePresence>

              {/* Action Buttons */}
              <AnimatePresence>
                {selectedFile && !uploading && (
                  <MotionBox
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -20 }}
                  >
                    <HStack spacing={4}>
                      <Button
                        size="lg"
                        leftIcon={<Icon as={FiSave} />}
                        onClick={handleUpload}
                        bgGradient="linear(to-r, brand.200, purple.500)"
                        color="white"
                        _hover={{
                          bgGradient: "linear(to-r, brand.300, purple.600)",
                          transform: "translateY(-2px)",
                          boxShadow: "xl"
                        }}
                        flex={1}
                        h="60px"
                        borderRadius="xl"
                        fontSize="lg"
                        fontWeight="bold"
                      >
                        Upload Asset
                      </Button>
                      
                      <Button
                        size="lg"
                        variant="outline"
                        leftIcon={<Icon as={FiX} />}
                        onClick={() => {
                          setSelectedFile(null);
                          setPreviewUrl("");
                          setFormData({
                            name: "",
                            description: "",
                            category: "",
                            tags: [],
                            keywords: "",
                            is_public: true,
                          });
                          setCurrentStep(1);
                        }}
                        borderColor="gray.300"
                        color="gray.600"
                        _hover={{ bg: "gray.100" }}
                        h="60px"
                        borderRadius="xl"
                        px={8}
                      >
                        Cancel
                      </Button>
                    </HStack>
                  </MotionBox>
                )}
              </AnimatePresence>
            </VStack>

            {/* Sidebar Info */}
            <VStack spacing={6} align="stretch">
              {/* File Info Card */}
              <MotionBox
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.2 }}
              >
                <Card bg="white" borderRadius="2xl" boxShadow="xl" border="1px" borderColor="gray.100">
                  <CardBody>
                    <VStack align="stretch" spacing={4}>
                      <Flex align="center" gap={2}>
                        <Icon as={FiInfo} color="brand.200" w={5} h={5} />
                        <Text fontWeight="bold" fontSize="lg">File Information</Text>
                      </Flex>
                      
                      {selectedFile ? (
                        <VStack align="stretch" spacing={3} divider={<Box borderColor="gray.100" />}>
                          <InfoRow label="File Name" value={selectedFile.name} />
                          <InfoRow 
                            label="Type"
                                                        value={fileTypeInfo?.label || 'Unknown'}
                            badgeColor={fileTypeInfo?.color}
                          />
                          <InfoRow label="Size" value={`${(selectedFile.size / 1024 / 1024).toFixed(2)} MB`} />
                          <InfoRow label="MIME Type" value={selectedFile.type || 'Unknown'} />
                          <InfoRow label="Last Modified" value={new Date(selectedFile.lastModified).toLocaleDateString()} />
                        </VStack>
                      ) : (
                        <VStack spacing={3} py={4}>
                          <Icon as={FiFile} w={12} h={12} color="gray.300" />
                          <Text color="gray.500" textAlign="center">
                            No file selected
                          </Text>
                          <Text fontSize="sm" color="gray.400" textAlign="center">
                            Upload a file to see details
                          </Text>
                        </VStack>
                      )}
                    </VStack>
                  </CardBody>
                </Card>
              </MotionBox>

              {/* Supported Formats Card */}
              <MotionBox
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.3 }}
              >
                <Card bg="white" borderRadius="2xl" boxShadow="xl" border="1px" borderColor="gray.100">
                  <CardBody>
                    <VStack align="stretch" spacing={4}>
                      <Flex align="center" gap={2}>
                        <Icon as={FiBox} color="purple.500" w={5} h={5} />
                        <Text fontWeight="bold" fontSize="lg">Supported Formats</Text>
                      </Flex>
                      
                      <VStack align="stretch" spacing={3}>
                        <FormatSection 
                          title="3D Models" 
                          formats={['GLB', 'GLTF', 'OBJ', 'FBX', 'STL', 'DAE', '3DS']} 
                          color="purple" 
                        />
                        <FormatSection 
                          title="Images" 
                          formats={['JPG', 'JPEG', 'PNG', 'GIF', 'WEBP', 'SVG', 'BMP']} 
                          color="green" 
                        />
                        <FormatSection 
                          title="Videos" 
                          formats={['MP4', 'MOV', 'AVI', 'WEBM', 'MKV', 'WMV']} 
                          color="red" 
                        />
                        <FormatSection 
                          title="Documents" 
                          formats={['PDF', 'DOC', 'DOCX', 'TXT', 'PPT', 'PPTX']} 
                          color="blue" 
                        />
                      </VStack>
                    </VStack>
                  </CardBody>
                </Card>
              </MotionBox>

              {/* Quick Tips Card */}
              <MotionBox
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.4 }}
              >
                <Card bg="white" borderRadius="2xl" boxShadow="xl" border="1px" borderColor="gray.100">
                  <CardBody>
                    <VStack align="stretch" spacing={4}>
                      <Flex align="center" gap={2}>
                        <Icon as={FiAlertCircle} color="orange.500" w={5} h={5} />
                        <Text fontWeight="bold" fontSize="lg">Upload Tips</Text>
                      </Flex>
                      
                      <VStack align="stretch" spacing={3}>
                        <TipItem 
                          icon={FiCheck}
                          text="Use descriptive names for better searchability"
                        />
                        <TipItem 
                          icon={FiCheck}
                          text="Add relevant tags to help others find your asset"
                        />
                        <TipItem 
                          icon={FiCheck}
                          text="Include keywords for improved SEO"
                        />
                        <TipItem 
                          icon={FiCheck}
                          text="Choose the right category for organization"
                        />
                        <TipItem 
                          icon={FiCheck}
                          text="Keep file sizes under 100MB for faster uploads"
                        />
                      </VStack>
                    </VStack>
                  </CardBody>
                </Card>
              </MotionBox>
            </VStack>
          </Grid>
        </Container>
      </Box>
    </Flex>
  );
}

// Helper Components
const Circle = ({ step, current, label }: { step: number; current: number; label: string }) => (
  <VStack spacing={1}>
    <Flex
      w="40px"
      h="40px"
      borderRadius="full"
      align="center"
      justify="center"
      bg={current >= step ? "brand.200" : "gray.200"}
      color={current >= step ? "white" : "gray.500"}
      fontWeight="bold"
      fontSize="sm"
      position="relative"
    >
      {current > step ? <Icon as={FiCheck} /> : step}
    </Flex>
    <Text fontSize="xs" color={current >= step ? "brand.200" : "gray.500"} fontWeight="medium">
      {label}
    </Text>
  </VStack>
);

const Divider = ({ w }: { w: string }) => (
  <Box w={w} h="2px" bg="gray.200" mx={1} />
);

const InfoRow = ({ label, value, badgeColor }: { label: string; value: string; badgeColor?: string }) => (
  <Flex justify="space-between" align="center">
    <Text fontSize="sm" color="gray.600" fontWeight="medium">
      {label}
    </Text>
    {badgeColor ? (
      <Badge colorScheme={badgeColor} fontSize="xs" px={2} py={1}>
        {value}
      </Badge>
    ) : (
      <Text fontSize="sm" color="gray.700" maxW="150px" isTruncated>
        {value}
      </Text>
    )}
  </Flex>
);

const FormatSection = ({ title, formats, color }: { title: string; formats: string[]; color: string }) => (
  <Box>
    <Text fontSize="sm" fontWeight="semibold" color="gray.700" mb={2}>
      {title}
    </Text>
    <Wrap spacing={2}>
      {formats.map((format) => (
        <WrapItem key={format}>
          <Badge
            colorScheme={color}
            variant="subtle"
            fontSize="xs"
            px={2}
            py={1}
            borderRadius="md"
          >
            {format}
          </Badge>
        </WrapItem>
      ))}
    </Wrap>
  </Box>
);

const TipItem = ({ icon, text }: { icon: any; text: string }) => (
  <HStack spacing={3} align="start">
    <Icon as={icon} w={4} h={4} color="green.500" mt={0.5} />
    <Text fontSize="sm" color="gray.600" lineHeight="tall">
      {text}
    </Text>
  </HStack>
);