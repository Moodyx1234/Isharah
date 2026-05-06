import { useEffect, lazy, Suspense } from "react";
import { BrowserRouter, Routes, Route, Navigate, Outlet, useParams } from "react-router-dom";
import { useTranslation } from "react-i18next";

const LandingPage = lazy(() => import("./pages/LandingPage"));
const WhoAreYou = lazy(() => import("./pages/WhoAreYou"));
const LecturerPage = lazy(() => import("./pages/LecturerPage"));
const DeafStudentPage = lazy(() => import("./pages/DeafStudentPage"));
const BlindStudentPage = lazy(() => import("./pages/BlindStudentPage"));
const SightedStudentPage = lazy(() => import("./pages/SightedStudentPage"));

function LocaleLayout() {
  const { locale = "ar" } = useParams<{ locale: string }>();
  const { i18n } = useTranslation();

  useEffect(() => {
    const lang = locale === "ar" || locale === "en" ? locale : "ar";
    if (i18n.language !== lang) i18n.changeLanguage(lang);
    document.documentElement.lang = lang;
    document.documentElement.dir = lang === "ar" ? "rtl" : "ltr";
    document.documentElement.style.fontFamily =
      lang === "ar" ? '"Tajawal", Arial, sans-serif' : '"Inter", Helvetica, sans-serif';
  }, [locale, i18n]);

  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center hero-mesh" />}>
      <Outlet />
    </Suspense>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Navigate to="/ar" replace />} />
        <Route path="/:locale" element={<LocaleLayout />}>
          <Route index element={<LandingPage />} />
          <Route path="login" element={<WhoAreYou />} />
          <Route path="lecturer" element={<LecturerPage />} />
          <Route path="student/deaf" element={<DeafStudentPage />} />
          <Route path="student/blind" element={<BlindStudentPage />} />
          <Route path="student/sighted" element={<SightedStudentPage />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
