import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import React from "react";
import { Route, Switch } from "wouter";
import { SuperadminGuard, WorkspaceGuard } from "./components/AccessGuards";
import ErrorBoundary from "./components/ErrorBoundary";
import InstallPrompt from "./components/InstallPrompt";
import { ThemeProvider } from "./contexts/ThemeContext";
import AdminDashboard from "./pages/AdminDashboard";
import BranchesPage from "./pages/BranchesPage";
import BusinessProfilePage from "./pages/BusinessProfilePage";
import CashierPage from "./pages/CashierPage";
import ChangePasswordPage from "./pages/ChangePasswordPage";
import FinanceReportPage from "./pages/FinanceReportPage";
import LandingPage from "./pages/LandingPage";
import LoginPage from "./pages/LoginPage";
import NotFound from "./pages/NotFound";
import OnboardingPage from "./pages/OnboardingPage";
import ProductsPage from "./pages/ProductsPage";
import ProductArchivePage from "./pages/ProductArchivePage";
import PromotionsPage from "./pages/PromotionsPage";
import QrLabelsPage from "./pages/QrLabelsPage";
import ReceiptSettingsPage from "./pages/ReceiptSettingsPage";
import StockPage from "./pages/StockPage";
import SuperadminPage from "./pages/SuperadminPage";
import SuperadminSettingsPage from "./pages/SuperadminSettingsPage";
import SuperadminUsersPage from "./pages/SuperadminUsersPage";
import TeamPage from "./pages/TeamPage";
import TransactionsPage from "./pages/TransactionsPage";

function Router() {
  return <Switch>
    <Route path="/" component={LandingPage} />
    <Route path="/login" component={LoginPage} />
    <Route path="/ganti-password" component={ChangePasswordPage} />
    <Route path="/onboarding" component={OnboardingPage} />
    <Route path="/dashboard"><WorkspaceGuard adminOnly><AdminDashboard /></WorkspaceGuard></Route>
    <Route path="/pos"><WorkspaceGuard posOnly><CashierPage /></WorkspaceGuard></Route>
    <Route path="/produk"><WorkspaceGuard adminOnly><ProductsPage /></WorkspaceGuard></Route>
    <Route path="/produk/arsip"><WorkspaceGuard adminOnly><ProductArchivePage /></WorkspaceGuard></Route>
    <Route path="/promo"><WorkspaceGuard tenantOwnerOnly><PromotionsPage /></WorkspaceGuard></Route>
    <Route path="/stok"><WorkspaceGuard adminOnly><StockPage /></WorkspaceGuard></Route>
    <Route path="/label-qr"><WorkspaceGuard adminOnly><QrLabelsPage /></WorkspaceGuard></Route>
    <Route path="/transaksi"><WorkspaceGuard adminOnly><TransactionsPage /></WorkspaceGuard></Route>
    <Route path="/laporan"><WorkspaceGuard adminOnly><FinanceReportPage /></WorkspaceGuard></Route>
    <Route path="/cabang"><WorkspaceGuard tenantOwnerOnly><BranchesPage /></WorkspaceGuard></Route>
    <Route path="/pengguna"><WorkspaceGuard tenantOwnerOnly><TeamPage /></WorkspaceGuard></Route>
    <Route path="/profil-usaha"><WorkspaceGuard tenantOwnerOnly><BusinessProfilePage /></WorkspaceGuard></Route>
    <Route path="/pengaturan-struk"><WorkspaceGuard tenantOwnerOnly><ReceiptSettingsPage /></WorkspaceGuard></Route>
    <Route path="/superadmin"><SuperadminGuard><SuperadminPage /></SuperadminGuard></Route>
    <Route path="/superadmin/pengaturan"><SuperadminGuard><SuperadminSettingsPage /></SuperadminGuard></Route>
    <Route path="/superadmin/pengguna"><SuperadminGuard><SuperadminUsersPage /></SuperadminGuard></Route>
    <Route path="/404" component={NotFound} />
    <Route component={NotFound} />
  </Switch>;
}

export default function App() {
  return <ErrorBoundary><ThemeProvider defaultTheme="light"><TooltipProvider><Toaster /><Router /><InstallPrompt /></TooltipProvider></ThemeProvider></ErrorBoundary>;
}
