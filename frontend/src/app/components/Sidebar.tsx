"use client";

import {
  Box,
  VStack,
  IconButton,
  Tooltip,
  Text,
  Avatar,
  AlertDialog,
  AlertDialogBody,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogContent,
  AlertDialogOverlay,
  Button,
  useDisclosure,
} from "@chakra-ui/react";
import { motion } from "framer-motion";
import { Home, Upload, Settings, LogOut, Users, Activity, Star } from "lucide-react";
import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";

const MotionBox = motion.create(Box);

export default function Sidebar() {
  const [isOpen, setIsOpen] = useState(false);
  const [role, setRole] = useState<string | null>(null);
  const [username, setUsername] = useState<string | null>(null);
  const router = useRouter();

  // For logout confirmation dialog
  const { isOpen: isLogoutOpen, onOpen: onLogoutOpen, onClose: onLogoutClose } = useDisclosure();
  const cancelRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const storedRole = localStorage.getItem("role");
    const storedUsername = localStorage.getItem("username");
    setRole(storedRole);
    setUsername(storedUsername);
  }, []);

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("role");
    localStorage.removeItem("username");
    router.push("/login");
    onLogoutClose();
  };

  const goTo = (path: string) => router.push(path);

  return (
    <>
      <MotionBox
        position="fixed"
        top="0"
        left="0"
        h="100vh"
        bg="linear-gradient(135deg, #f5f3ef, #d8e6f3)"
        boxShadow="md"
        zIndex="1000"
        borderRight="1px solid #e0e0e0"
        initial={{ width: "60px" }}
        animate={{ width: isOpen ? "220px" : "60px" }}
        transition={{ duration: 0.3 }}
        onMouseEnter={() => setIsOpen(true)}
        onMouseLeave={() => setIsOpen(false)}
        display="flex"
        flexDirection="column"
        alignItems="center"
        justifyContent="space-between"
        overflow="hidden"
        p={2}
      >
        {/* User Info */}
        <VStack spacing={2} mt={4}>
          <Avatar name={username || "User"} size="sm" />
          {isOpen && (
            <>
              <Text fontSize="sm" fontWeight="bold">
                {username || "User"}
              </Text>
              <Text fontSize="xs" color="gray.600">
                {role || "Role"}
              </Text>
            </>
          )}
        </VStack>

        {/* Sidebar Buttons */}
        <VStack spacing={4} mt={6}>
          <Tooltip label="Dashboard" placement="right">
            <IconButton
              aria-label="Dashboard"
              icon={<Home />}
              variant="ghost"
              onClick={() => goTo("/dashboard")}
            />
          </Tooltip>

          {/* My Favorites - Available for all roles */}
          <Tooltip label="My Favorites" placement="right">
            <IconButton
              aria-label="My Favorites"
              icon={<Star />}
              variant="ghost"
              onClick={() => goTo("/favorites")}
            />
          </Tooltip>

          {/* Upload - Hidden for Viewers */}
          {role !== "Viewer" && (
            <Tooltip label="Upload" placement="right">
              <IconButton
                aria-label="Upload"
                icon={<Upload />}
                variant="ghost"
                onClick={() => goTo("/registerasset")}
              />
            </Tooltip>
          )}

          {/* Admin Only Section */}
          {role === "Admin" && (
            <>
              <Tooltip label="Manage Users" placement="right">
                <IconButton
                  aria-label="Manage Users"
                  icon={<Users />}
                  variant="ghost"
                  onClick={() => goTo("/manageuser")}
                />
              </Tooltip>

              <Tooltip label="Activity Log" placement="right">
                <IconButton
                  aria-label="Activity Log"
                  icon={<Activity />}
                  variant="ghost"
                  onClick={() => goTo("/activity-log")}
                />
              </Tooltip>
            </>
          )}

          <Tooltip label="Settings" placement="right">
            <IconButton
              aria-label="Settings"
              icon={<Settings />}
              variant="ghost"
              onClick={() => goTo("/settings")}
            />
          </Tooltip>
        </VStack>

        {/* Logout */}
        <VStack spacing={4} mb={6}>
          <Tooltip label="Logout" placement="right">
            <IconButton
              aria-label="Logout"
              icon={<LogOut />}
              variant="ghost"
              onClick={onLogoutOpen}
              colorScheme="red"
            />
          </Tooltip>
        </VStack>
      </MotionBox>

      {/* Logout Confirmation Dialog */}
      <AlertDialog
        isOpen={isLogoutOpen}
        leastDestructiveRef={cancelRef}
        onClose={onLogoutClose}
        isCentered
      >
        <AlertDialogOverlay>
          <AlertDialogContent>
            <AlertDialogHeader fontSize="lg" fontWeight="bold">
              Confirm Logout
            </AlertDialogHeader>

            <AlertDialogBody>
              Are you sure you want to logout? You will need to sign in again to access the system.
            </AlertDialogBody>

            <AlertDialogFooter>
              <Button ref={cancelRef} onClick={onLogoutClose}>
                Cancel
              </Button>
              <Button colorScheme="red" onClick={handleLogout} ml={3}>
                Logout
              </Button>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialogOverlay>
      </AlertDialog>
    </>
  );
}