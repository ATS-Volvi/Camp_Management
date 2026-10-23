import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import ProtectedRoute from "@/components/ProtectedRoute";
import AppLayout from "./components/layout/AppLayout";
import Launchpad from "./pages/Launchpad";
import Dashboard from "./pages/Dashboard";
import HomeDashboard from "./pages/HomeDashboard";
import CampsList from "./pages/CampsList";
import CampDetails from "./pages/CampDetails";
import RepairMaintenance from "./pages/RepairMaintenance";
import AssetManagement from "./pages/AssetManagement";
import AssetDetails from "./pages/AssetDetails";
import CheckInOut from "./pages/CheckInOut";
import InventoryManagement from "./pages/InventoryManagement";
import EmployeeMaster from "./pages/EmployeeMaster";
import Reports from "./pages/Reports";
import ItemAssignments from "./pages/ItemAssignments";
import Activities from "./pages/Activities";
import AlertsNotifications from "./pages/AlertsNotifications";
import Attendance from "./pages/Attendance";
import AIReports from "./pages/AIReports";
import AnomalyReport from "./pages/AnomalyReport";
import MessCatering from "./pages/MessCatering";
import CookRequests from "./pages/CookRequests";
import VisitorManagement from "./pages/VisitorManagement";
import UserManagement from "./pages/UserManagement";
import PermissionMatrix from "./pages/PermissionMatrix";
import ChangePassword from "./pages/ChangePassword";
import AuditLogs from "./pages/AuditLogs";
import FoodSafetyAudit from "./pages/FoodSafetyAudit";
import BottomlineReport from "./pages/BottomlineReport";
import GroceryInventory from "./pages/GroceryInventory";
import PreventiveMaintenance from "./pages/PreventiveMaintenance";
import MealManagement from "./pages/MealManagement";
import FoodCancellation from "./pages/FoodCancellation";
import StaffKPI from "./pages/StaffKPI";
import RoomCategoryMaster from "./pages/RoomCategoryMaster";
import SupplierMaster from "./pages/SupplierMaster";
import DesignationRoomMapping from "./pages/DesignationRoomMapping";
import Login from "./pages/Login";
import NotFound from "./pages/NotFound";

import ErrorBoundary from "./components/ErrorBoundary";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route
              path="/"
              element={
                <ProtectedRoute>
                  <ErrorBoundary fallbackTitle="Error loading Launchpad">
                    <Launchpad />
                  </ErrorBoundary>
                </ProtectedRoute>
              }
            />
            <Route
              element={
                <ProtectedRoute>
                  <ErrorBoundary fallbackTitle="Application Error">
                    <AppLayout />
                  </ErrorBoundary>
                </ProtectedRoute>
              }
            >
              <Route path="/dashboard" element={<Dashboard />} />
              <Route path="/home" element={<HomeDashboard />} />
              <Route path="/camps" element={<CampsList />} />
              <Route path="/camps/:campId" element={<CampDetails />} />
              <Route path="/maintenance" element={<RepairMaintenance />} />
              <Route path="/staff-kpi" element={<StaffKPI />} />
              <Route path="/assets" element={<AssetManagement />} />
              <Route path="/assets/:id" element={<AssetDetails />} />
              <Route path="/check-in-out" element={<CheckInOut />} />
              <Route path="/inventory" element={<InventoryManagement />} />
              <Route path="/employees" element={<EmployeeMaster />} />
              <Route path="/item-assignments" element={<ItemAssignments />} />
              <Route path="/reports" element={<Reports />} />
              <Route path="/activities" element={<Activities />} />
              <Route path="/alerts" element={<AlertsNotifications />} />
              <Route path="/attendance" element={<Attendance />} />
              <Route path="/ai-reports" element={<AIReports />} />
              <Route path="/anomaly-report" element={<AnomalyReport />} />
              <Route path="/mess-catering" element={<MessCatering />} />
              <Route path="/cook-requests" element={<CookRequests />} />
              <Route path="/visitors" element={<VisitorManagement />} />
              <Route path="/admin/users" element={<UserManagement />} />
              <Route path="/admin/permissions" element={<PermissionMatrix />} />
              <Route path="/admin/audit-logs" element={<AuditLogs />} />
              <Route path="/change-password" element={<ChangePassword />} />
              <Route path="/food-safety" element={<FoodSafetyAudit />} />
              <Route path="/bottomline" element={<BottomlineReport />} />
              <Route path="/grocery-inventory" element={<GroceryInventory />} />
              <Route path="/preventive-maintenance" element={<PreventiveMaintenance />} />
              <Route path="/meal-management" element={<MealManagement />} />
              <Route path="/food-cancellation" element={<FoodCancellation />} />
              <Route path="/admin/room-categories" element={<RoomCategoryMaster />} />
              <Route path="/admin/suppliers" element={<SupplierMaster />} />
              <Route path="/admin/clients" element={<Navigate to="/admin/suppliers" replace />} />
              <Route path="/admin/designation-mapping" element={<DesignationRoomMapping />} />
            </Route>
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
