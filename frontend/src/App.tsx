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
import Subscriptions from "./pages/dashboard/Subscriptions.tsx";
import Rate from "./pages/customer/Rate.tsx";
import Menu from "./pages/Menu.tsx";
import MenuQRCode from "./pages/dashboard/MenuQRCode.tsx";
import MenuQRGenerator from "./pages/MenuQRGenerator.tsx";
import MenuManager from "./pages/dashboard/MenuManager.tsx";
import MenuQRViewer from "./pages/MenuQRViewer.tsx";

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
          <Route path="/menu/:publicId" element={<Menu />} />
          <Route path="/menu-qr-generator" element={<MenuQRGenerator />} />
           <Route path="/menu-qr-view/:publicId" element={<MenuQRViewer />} />
          <Route path="/dashboard" element={<DashboardLayout />}>
            <Route index element={<Overview />} />
            <Route path="businesses" element={<Businesses />} />
            <Route path="businesses/new" element={<NewBusiness />} />
            <Route path="businesses/:id" element={<BusinessDetail />} />
            <Route path="businesses/:id/menu-qr" element={<MenuQRCode />} />
            <Route path="menu-qr-generator" element={<MenuManager />} />
            <Route path="ratings" element={<Ratings />} />
            <Route path="complaints" element={<Feedback />} />
            <Route path="wallet" element={<WalletPage />} />
            <Route path="subscriptions" element={<Subscriptions />} />
          </Route>
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;