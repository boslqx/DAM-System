"use client";

import {
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalFooter,
  ModalBody,
  ModalCloseButton,
  Button,
  FormControl,
  FormLabel,
  Input,
  Textarea,
  Select,
  Switch,
  VStack,
  Tag,
  TagLabel,
  TagCloseButton,
  Wrap,
  WrapItem,
  InputGroup,
  InputRightElement,
  useToast,
} from "@chakra-ui/react";
import { useState, useEffect } from "react"; // Fixed: Added useEffect import

interface Asset {
  id: number;
  name: string;
  description: string;
  category: string;
  tags: string[];
  keywords: string;
  is_public: boolean;
  file_type: string;
}

interface EditAssetModalProps {
  isOpen: boolean;
  onClose: () => void;
  asset: Asset | null;
  onSave: (assetData: any) => Promise<void>;
  availableCategories: string[];
}

export default function EditAssetModal({ 
  isOpen, 
  onClose, 
  asset, 
  onSave, 
  availableCategories 
}: EditAssetModalProps) {
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    category: "",
    tags: [] as string[],
    keywords: "",
    is_public: true,
  });
  const [newTag, setNewTag] = useState("");
  const [loading, setLoading] = useState(false);
  const toast = useToast();

  // FIXED: Changed useState to useEffect to reset form when asset changes
  useEffect(() => {
    if (asset) {
      setFormData({
        name: asset.name || "",
        description: asset.description || "",
        category: asset.category || "",
        tags: asset.tags || [],
        keywords: asset.keywords || "",
        is_public: asset.is_public !== undefined ? asset.is_public : true,
      });
    }
  }, [asset]); // This will run whenever the asset prop changes

  const handleSave = async () => {
    if (!asset) return;
    
    try {
      setLoading(true);
      await onSave({
        id: asset.id,
        ...formData
      });
      
      toast({
        title: "Asset updated successfully",
        status: "success",
        duration: 3000,
        isClosable: true,
      });
      
      onClose();
    } catch (error) {
      toast({
        title: "Error updating asset",
        status: "error",
        duration: 4000,
        isClosable: true,
      });
    } finally {
      setLoading(false);
    }
  };

  const addTag = () => {
    if (newTag.trim() && !formData.tags.includes(newTag.trim())) {
      setFormData({
        ...formData,
        tags: [...formData.tags, newTag.trim()]
      });
      setNewTag("");
    }
  };

  const removeTag = (tagToRemove: string) => {
    setFormData({
      ...formData,
      tags: formData.tags.filter(tag => tag !== tagToRemove)
    });
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      addTag();
    }
  };

  if (!asset) return null;

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="xl">
      <ModalOverlay />
      <ModalContent>
        <ModalHeader>Edit Asset: {asset.name}</ModalHeader>
        <ModalCloseButton />
        <ModalBody>
          <VStack spacing={4}>
            <FormControl>
              <FormLabel>Asset Name</FormLabel>
              <Input
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Enter asset name"
              />
            </FormControl>

            <FormControl>
              <FormLabel>Description</FormLabel>
              <Textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Enter asset description"
                rows={3}
              />
            </FormControl>

            <FormControl>
              <FormLabel>Category</FormLabel>
              <Select
                value={formData.category}
                onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                placeholder="Select category"
              >
                {availableCategories.map(cat => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </Select>
            </FormControl>

            <FormControl>
              <FormLabel>Tags</FormLabel>
              <InputGroup>
                <Input
                  value={newTag}
                  onChange={(e) => setNewTag(e.target.value)}
                  onKeyPress={handleKeyPress}
                  placeholder="Add tags (press Enter)"
                />
                <InputRightElement width="4.5rem">
                  <Button h="1.75rem" size="sm" onClick={addTag}>
                    Add
                  </Button>
                </InputRightElement>
              </InputGroup>
              
              {formData.tags.length > 0 && (
                <Wrap mt={2}>
                  {formData.tags.map(tag => (
                    <WrapItem key={tag}>
                      <Tag size="md" colorScheme="blue" borderRadius="full">
                        <TagLabel>{tag}</TagLabel>
                        <TagCloseButton onClick={() => removeTag(tag)} />
                      </Tag>
                    </WrapItem>
                  ))}
                </Wrap>
              )}
            </FormControl>

            <FormControl>
              <FormLabel>Keywords</FormLabel>
              <Input
                value={formData.keywords}
                onChange={(e) => setFormData({ ...formData, keywords: e.target.value })}
                placeholder="Comma-separated keywords"
              />
            </FormControl>

            <FormControl display="flex" alignItems="center">
              <FormLabel mb="0">Public Asset</FormLabel>
              <Switch
                isChecked={formData.is_public}
                onChange={(e) => setFormData({ ...formData, is_public: e.target.checked })}
                colorScheme="blue"
              />
            </FormControl>
          </VStack>
        </ModalBody>

        <ModalFooter>
          <Button variant="ghost" mr={3} onClick={onClose}>
            Cancel
          </Button>
          <Button 
            colorScheme="blue" 
            onClick={handleSave}
            isLoading={loading}
          >
            Save Changes
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
}