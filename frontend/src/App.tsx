import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import Index from "./pages/Index.tsx";
import NotFound from "./pages/NotFound.tsx";
import SignUp from "./pages/SignUp.tsx";
import Login from "./pages/Login.tsx";
import ForgotPassword from "./pages/ForgotPassword.tsx";
import ResetPassword from "./pages/ResetPassword.tsx";
import VerifyEmail from "./pages/VerifyEmail.tsx";
import Onboarding from "./pages/Onboarding.tsx";
import DashboardLayout from "./components/dashboard/DashboardLayout.tsx";
import Overview from "./pages/dashboard/Overview.tsx";
import Businesses from "./pages/dashboard/Businesses.tsx";
import NewBusiness from "./pages/dashboard/NewBusiness.tsx";
import BusinessDetail from "./pages/dashboard/BusinessDetail.tsx";
import Ratings from "./pages/dashboard/Ratings.tsx";
import Feedback from "./pages/dashboard/Feedback.tsx";
import WalletPage from "./pages/dashboard/WalletPage.tsx";
import MessagePage from "./pages/dashboard/Message.tsx";
import Subscriptions from "./pages/dashboard/Subscriptions.tsx";
import BookingPage from "./pages/dashboard/BookingPage.tsx";
import CheckIn from "./pages/dashboard/CheckIn.tsx";
import StaffSettlement from "./pages/dashboard/StaffSettlement.tsx";
import ServicesPage from "./pages/dashboard/ServicesPage.tsx";
import ServiceSettlement from "./pages/dashboard/ServiceSettlement.tsx";
import Rate from "./pages/customer/Rate.tsx";
import PublicCheckIn from "./pages/customer/PublicCheckIn.tsx";
import PublicSettlementForm from "./pages/customer/PublicSettlementForm.tsx";
import Menu from "./pages/Menu.tsx";
import MenuQRCode from "./pages/dashboard/MenuQRCode.tsx";
import MenuQRGenerator from "./pages/MenuQRGenerator.tsx";
import MenuManager from "./pages/dashboard/MenuManager.tsx";
import MenuQRViewer from "./pages/MenuQRViewer.tsx";
import AdminLogin from "./pages/admin/AdminLogin.tsx";
import AdminDashboard from "./pages/admin/Dashboard.tsx";
import AdminUsers from "./pages/admin/Users.tsx";
import AdminBusinesses from "./pages/admin/Businesses.tsx";
import AdminFeedback from "./pages/admin/Feedback.tsx";
import UserDetail from "./pages/admin/UserDetail.tsx";
import AdminDashboardLayout from "./components/admin/AdminDashboardLayout.tsx";
import PublicBookingPage from "./pages/Book.tsx";
import AdminTransactions from "./pages/admin/Transactions.tsx";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Index />} />
          <Route path="/signup" element={<SignUp />} />
          <Route path="/login" element={<Login />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />
          <Route path="/reset-password" element={<ResetPassword />} />
          <Route path="/verify-email" element={<VerifyEmail />} />
          <Route path="/onboarding" element={<Onboarding />} />
          <Route path="/rate/:businessId" element={<Rate />} />
          <Route path="/checkin/:businessId" element={<PublicCheckIn />} />
          <Route path="/settle/:businessId" element={<PublicSettlementForm />} />
          <Route path="/menu/:publicId" element={<Menu />} />
          <Route path="/menu-qr-generator" element={<MenuQRGenerator />} />
          <Route path="/menu-qr-view/:publicId" element={<MenuQRViewer />} />

          {/* User Dashboard */}
          <Route path="/dashboard" element={<DashboardLayout />}>
            <Route index element={<Overview />} />
            <Route path="businesses" element={<Businesses />} />
            <Route path="businesses/new" element={<NewBusiness />} />
            <Route path="businesses/:id" element={<BusinessDetail />} />
            <Route path="businesses/:id/menu-qr" element={<MenuQRCode />} />
            <Route path="bookings" element={<BookingPage />} />
            <Route path="check-in" element={<CheckIn />} />
            <Route path="bookings/:id" element={<BookingPage />} />
            <Route path="menu-qr-generator" element={<MenuManager />} />
            <Route path="ratings" element={<Ratings />} />
            <Route path="complaints" element={<Feedback />} />
            <Route path="staff-settlement" element={<StaffSettlement />} />
            <Route path="services" element={<ServicesPage />} />
            <Route path="service-settlement" element={<ServiceSettlement />} />
            <Route path="message" element={<MessagePage />} />
            <Route path="wallet" element={<WalletPage />} />
             <Route path="subscriptions" element={<Subscriptions />} />
          </Route>

          {/* Public Booking Page */}
          <Route path="/book/:publicId" element={<PublicBookingPage />} />

          {/* Admin Routes */}
          <Route path="/admin/login" element={<AdminLogin />} />
          <Route path="/admin" element={<AdminDashboardLayout />}>
            <Route index element={<AdminDashboard />} />
            <Route path="dashboard" element={<AdminDashboard />} />
            <Route path="users" element={<AdminUsers />} />
            <Route path="users/:id" element={<UserDetail />} />
            <Route path="businesses" element={<AdminBusinesses />} />
            <Route path="businesses/:id" element={<AdminDashboard />} />
            <Route path="transactions" element={<AdminTransactions />} />
            <Route path="feedback" element={<AdminFeedback />} />
            
          </Route>

          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;