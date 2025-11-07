"use client";

import {
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalCloseButton,
  Box,
  Flex,
  VStack,
  HStack,
  Text,
  Image,
  Badge,
  Divider,
  IconButton,
  Tooltip,
  Grid,
  GridItem,
  Button,
  Wrap,
  WrapItem,
  Tag,
} from "@chakra-ui/react";
import { 
  DownloadIcon, 
  EditIcon, 
  DeleteIcon,
  StarIcon,
  ExternalLinkIcon
} from "@chakra-ui/icons";
import { FiCalendar, FiUser, FiFolder, FiFile, FiTag, FiInfo } from "react-icons/fi";

interface Asset {
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
  polygon_count?: number;
  dimensions?: any;
  is_favorited?: boolean;
  favorites_count?: number;
}

interface EnhancedPreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  asset: Asset | null;
  onEdit?: (asset: Asset) => void;
  onDelete?: (assetId: number) => void;
  onToggleFavorite?: () => void;
  canEdit?: boolean;
  previewUrl: string;
  previewType: string;
}

export default function EnhancedPreviewModal({
  isOpen,
  onClose,
  asset,
  onEdit,
  onDelete,
  onToggleFavorite,
  canEdit = false,
  previewUrl,
  previewType,
}: EnhancedPreviewModalProps) {
  if (!asset) return null;

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
  };

  const getFileTypeInfo = (fileType: string) => {
    const types: any = {
      'IMG': { label: 'Image', color: 'green', icon: '🖼️' },
      'VID': { label: 'Video', color: 'red', icon: '🎬' },
      'DOC': { label: 'Document', color: 'blue', icon: '📄' },
      '3D': { label: '3D Model', color: 'purple', icon: '🎯' },
      'OTH': { label: 'Other', color: 'gray', icon: '📦' },
    };
    return types[fileType] || types['OTH'];
  };

  const fileTypeInfo = getFileTypeInfo(asset.file_type);

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="6xl" isCentered>
      <ModalOverlay backdropFilter="blur(4px)" />
      <ModalContent maxH="90vh" borderRadius="2xl" overflow="hidden">
        {/* Header */}
        <ModalHeader 
          bg="white" 
          borderBottom="1px" 
          borderColor="gray.200"
          py={4}
        >
          <Flex justify="space-between" align="center">
            <HStack spacing={3}>
              <Text fontSize="2xl" fontWeight="bold" noOfLines={1}>
                {asset.name}
              </Text>
              <Badge 
                colorScheme={fileTypeInfo.color} 
                fontSize="sm" 
                px={3} 
                py={1}
                borderRadius="full"
              >
                {fileTypeInfo.icon} {fileTypeInfo.label}
              </Badge>
              {asset.is_favorited && (
                <StarIcon color="yellow.400" boxSize={5} />
              )}
            </HStack>

            <HStack spacing={2}>
              {onToggleFavorite && (
                <Tooltip label={asset.is_favorited ? "Remove from favorites" : "Add to favorites"}>
                  <IconButton
                    aria-label="Toggle favorite"
                    icon={<StarIcon />}
                    colorScheme={asset.is_favorited ? "yellow" : "gray"}
                    variant={asset.is_favorited ? "solid" : "ghost"}
                    onClick={onToggleFavorite}
                  />
                </Tooltip>
              )}
              
              {canEdit && onEdit && (
                <Tooltip label="Edit asset">
                  <IconButton
                    aria-label="Edit"
                    icon={<EditIcon />}
                    colorScheme="blue"
                    variant="ghost"
                    onClick={() => onEdit(asset)}
                  />
                </Tooltip>
              )}
              
              {canEdit && onDelete && (
                <Tooltip label="Delete asset">
                  <IconButton
                    aria-label="Delete"
                    icon={<DeleteIcon />}
                    colorScheme="red"
                    variant="ghost"
                    onClick={() => onDelete(asset.id)}
                  />
                </Tooltip>
              )}

              <Tooltip label="Download">
                <IconButton
                  aria-label="Download"
                  icon={<DownloadIcon />}
                  colorScheme="green"
                  variant="ghost"
                  as="a"
                  href={previewUrl}
                  download
                />
              </Tooltip>

              <Tooltip label="Open in new tab">
                <IconButton
                  aria-label="Open"
                  icon={<ExternalLinkIcon />}
                  variant="ghost"
                  as="a"
                  href={previewUrl}
                  target="_blank"
                />
              </Tooltip>
            </HStack>
          </Flex>
        </ModalHeader>
        
        <ModalCloseButton size="lg" />

        <ModalBody p={0}>
          <Grid templateColumns={{ base: "1fr", lg: "2fr 1fr" }} h="calc(90vh - 100px)">
            {/* Preview Area */}
            <GridItem 
              bg="gray.900" 
              display="flex" 
              alignItems="center" 
              justifyContent="center"
              position="relative"
              p={4}
            >
              {previewType === 'image' && (
                <Image
                  src={previewUrl}
                  alt={asset.name}
                  maxH="100%"
                  maxW="100%"
                  objectFit="contain"
                />
              )}
              
              {previewType === 'video' && (
                <video
                  src={previewUrl}
                  controls
                  autoPlay
                  style={{ 
                    maxWidth: '100%', 
                    maxHeight: '100%',
                    borderRadius: '8px'
                  }}
                />
              )}

              {previewType === '3d' && (
                <Box w="100%" h="100%">
                  <Text color="white" textAlign="center">
                    3D Model Preview
                  </Text>
                </Box>
              )}

              {(previewType === 'document' || previewType === 'other') && (
                <VStack spacing={4} color="white">
                  <Text fontSize="6xl">{fileTypeInfo.icon}</Text>
                  <Text fontSize="2xl" fontWeight="bold">
                    {asset.name}
                  </Text>
                  <Button
                    colorScheme="blue"
                    size="lg"
                    as="a"
                    href={previewUrl}
                    download
                  >
                    Download File
                  </Button>
                </VStack>
              )}
            </GridItem>

            {/* Info Panel */}
            <GridItem bg="white" overflowY="auto" p={6}>
              <VStack align="stretch" spacing={6}>
                {/* Description */}
                <Box>
                  <HStack mb={2}>
                    <FiInfo />
                    <Text fontWeight="bold" fontSize="lg">Description</Text>
                  </HStack>
                  <Text color="gray.600">
                    {asset.description || "No description provided"}
                  </Text>
                </Box>

                <Divider />

                {/* Details */}
                <Box>
                  <Text fontWeight="bold" fontSize="lg" mb={3}>Details</Text>
                  <VStack align="stretch" spacing={3}>
                    <HStack justify="space-between">
                      <HStack>
                        <FiFile />
                        <Text fontSize="sm" color="gray.600">File Size</Text>
                      </HStack>
                      <Text fontSize="sm" fontWeight="medium">
                        {formatFileSize(asset.file_size)}
                      </Text>
                    </HStack>

                    <HStack justify="space-between">
                      <HStack>
                        <FiFolder />
                        <Text fontSize="sm" color="gray.600">Category</Text>
                      </HStack>
                      <Badge colorScheme="blue">
                        {asset.category || 'Uncategorized'}
                      </Badge>
                    </HStack>

                    <HStack justify="space-between">
                      <HStack>
                        <FiUser />
                        <Text fontSize="sm" color="gray.600">Uploaded by</Text>
                      </HStack>
                      <Text fontSize="sm" fontWeight="medium">
                        {asset.created_by_username}
                      </Text>
                    </HStack>

                    <HStack justify="space-between">
                      <HStack>
                        <FiCalendar />
                        <Text fontSize="sm" color="gray.600">Created</Text>
                      </HStack>
                      <Text fontSize="sm" fontWeight="medium">
                        {formatDate(asset.created_at)}
                      </Text>
                    </HStack>

                    <HStack justify="space-between">
                      <Text fontSize="sm" color="gray.600">Visibility</Text>
                      <Badge colorScheme={asset.is_public ? "green" : "orange"}>
                        {asset.is_public ? "Public" : "Private"}
                      </Badge>
                    </HStack>

                    {asset.favorites_count !== undefined && (
                      <HStack justify="space-between">
                        <Text fontSize="sm" color="gray.600">Favorites</Text>
                        <HStack>
                          <StarIcon color="yellow.400" boxSize={4} />
                          <Text fontSize="sm" fontWeight="medium">
                            {asset.favorites_count}
                          </Text>
                        </HStack>
                      </HStack>
                    )}

                    {asset.polygon_count && (
                      <HStack justify="space-between">
                        <Text fontSize="sm" color="gray.600">Polygon Count</Text>
                        <Text fontSize="sm" fontWeight="medium">
                          {asset.polygon_count.toLocaleString()}
                        </Text>
                      </HStack>
                    )}
                  </VStack>
                </Box>

                <Divider />

                {/* Tags */}
                {asset.tags && asset.tags.length > 0 && (
                  <Box>
                    <HStack mb={3}>
                      <FiTag />
                      <Text fontWeight="bold" fontSize="lg">Tags</Text>
                    </HStack>
                    <Wrap>
                      {asset.tags.map((tag, index) => (
                        <WrapItem key={index}>
                          <Tag 
                            size="md" 
                            colorScheme="blue" 
                            borderRadius="full"
                            variant="subtle"
                          >
                            {tag}
                          </Tag>
                        </WrapItem>
                      ))}
                    </Wrap>
                  </Box>
                )}

                {/* Keywords */}
                {asset.keywords && (
                  <>
                    <Divider />
                    <Box>
                      <Text fontWeight="bold" fontSize="sm" mb={2} color="gray.600">
                        Keywords
                      </Text>
                      <Text fontSize="sm" color="gray.600">
                        {asset.keywords}
                      </Text>
                    </Box>
                  </>
                )}

                {/* Quick Actions */}
                <Divider />
                <VStack align="stretch" spacing={2}>
                  <Button
                    leftIcon={<DownloadIcon />}
                    colorScheme="blue"
                    size="md"
                    as="a"
                    href={previewUrl}
                    download
                  >
                    Download Asset
                  </Button>
                  
                  <Button
                    leftIcon={<ExternalLinkIcon />}
                    variant="outline"
                    size="md"
                    as="a"
                    href={previewUrl}
                    target="_blank"
                  >
                    Open in New Tab
                  </Button>
                </VStack>
              </VStack>
            </GridItem>
          </Grid>
        </ModalBody>
      </ModalContent>
    </Modal>
  );
}