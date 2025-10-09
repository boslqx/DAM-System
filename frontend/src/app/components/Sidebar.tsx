"use client";

import { Box, VStack, IconButton, Tooltip, Text, Avatar } from "@chakra-ui/react";
import { motion } from "framer-motion";
import { Home, Upload, Settings, LogOut, Users, Activity } from "lucide-react"; // ✅ Added Activity icon
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";

// framer-motion v11 deprecates factory call; use create()
const MotionBox = motion.create(Box);

export default function Sidebar() {
  const [isOpen, setIsOpen] = useState(false);
  const [role, setRole] = useState<string | null>(null);
  const [username, setUsername] = useState<string | null>(null);
  const router = useRouter();

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
  };

  // helper: navigate to route
  const goTo = (path: string) => router.push(path);

  return (
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
      {/* 🔹 User Info */}
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

      {/* 🔹 Sidebar Buttons */}
      <VStack spacing={4} mt={6}>
        <Tooltip label="Dashboard" placement="right">
          <IconButton aria-label="Dashboard" icon={<Home />} variant="ghost" onClick={() => goTo("/dashboard")} />
        </Tooltip>

        <Tooltip label="Upload" placement="right">
          <IconButton aria-label="Upload" icon={<Upload />} variant="ghost" onClick={() => goTo("/registerasset")} />
        </Tooltip>

        {/* 👑 Admin Only Section */}
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

            {/* ✅ NEW: Activity Log Tab */}
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
          <IconButton aria-label="Settings" icon={<Settings />} variant="ghost" onClick={() => goTo("/settings")} />
        </Tooltip>
      </VStack>

      {/* 🔹 Logout */}
      <VStack spacing={4} mb={6}>
        <Tooltip label="Logout" placement="right">
          <IconButton aria-label="Logout" icon={<LogOut />} variant="ghost" onClick={handleLogout} />
        </Tooltip>
      </VStack>
    </MotionBox>
  );
}