import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import useAppStore from './store/useAppStore';

// 공통 및 인증 페이지
import LoginPage from './pages/LoginPage';
import DoctorRegister from './pages/DoctorRegister';
import PatientRegister from './pages/PatientRegister';

// 레이아웃 컴포넌트
import PatientLayout from './layouts/PatientLayout';
import DoctorLayout from './layouts/DoctorLayout';

import PatientDashboard from './pages/patient/PatientHome';
import PatientRecord from './pages/patient/DailyRecordPage';
import PatientRecordList from './pages/patient/RecordListPage';
import PatientSurvey from './pages/patient/HealthSurveyPage';
import PatientChat from './pages/patient/SymptomHelperPage';
import PatientSchedule from './pages/patient/VisitSchedulePage';
import PatientMyPage from './pages/patient/PatientMyPage';

import DoctorDashboard from './pages/doctor/DoctorHome';
import PatientInsightPage from './pages/doctor/PatientInsightPage';
import PatientInfoPage from './pages/doctor/PatientInfoPage';
import RecordLogsPage from './pages/doctor/RecordLogsPage';
import AiReportPage from './pages/doctor/AiReportPage';
import QuestionManagePage from './pages/doctor/QuestionManagePage';
import QuestionCheckPage from './pages/doctor/QuestionCheckPage';
import PatientChartsPage from './pages/doctor/PatientChartsPage';
import AppointmentCreatePage from './pages/doctor/AppointmentCreatePage';
import AppointmentCheckPage from './pages/doctor/AppointmentCheckPage';
import DoctorMyPage from './pages/doctor/DoctorMyPage';


function App() {
  return (
    <Router>
      <Routes>
        {/* 공통 경로 */}
        {/* 첫 화면을 로그인 페이지로 설정 */}
        <Route path="/login" element={<LoginPage />} />
        
        {/* 회원가입 경로 */}
        <Route path="/register/doctor" element={<DoctorRegister />} />
        <Route path="/register/patient" element={<PatientRegister />} />

        {/* 환자 전용 경로 (PatientLayout 적용) */}
        <Route path="/patient" element={<RequireRole role="patient"><PatientLayout /></RequireRole>}>
          <Route index element={<PatientDashboard />} />
          <Route path="record" element={<PatientRecord />} />
          <Route path="record_list" element={<PatientRecordList />} />
          <Route path="survey" element={<PatientSurvey />} />
          <Route path="chat" element={<PatientChat />} />
          <Route path="schedule" element={<PatientSchedule />} />
          <Route path="mypage" element={<PatientMyPage />} />
        </Route>

        {/* 의사 전용 경로 (DoctorLayout 적용) */}
        <Route path="/doctor" element={<RequireRole role="doctor"><DoctorLayout /></RequireRole>}>
          <Route index element={<DoctorDashboard />} />
          {/* 특정 환자 선택 시의 경로 */}
          <Route path=":id" element={<PatientInsightPage />} />
          <Route path=":id/info" element={<PatientInfoPage />} />
          <Route path=":id/charts" element={<PatientChartsPage />} />
          <Route path=":id/ai_report" element={<AiReportPage />} />
          <Route path=":id/logs" element={<RecordLogsPage />} />
          <Route path=":id/questions_manage" element={<QuestionManagePage />} />
          <Route path=":id/questions_list" element={<QuestionCheckPage />} />
          <Route path="appointments/new" element={<AppointmentCreatePage />} />
          <Route path="appointments/check" element={<AppointmentCheckPage />} />
          <Route path="mypage" element={<DoctorMyPage />} />
        </Route>

        {/* 리다이렉트 설정 */}
        {/* '/' 접속 시 로그인으로 이동 */}
        <Route path="/" element={<Navigate to="/login" replace />} />
        
        {/* 잘못된 모든 경로는 로그인 페이지로 이동 */}
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    </Router>
  );
}

function RequireRole({ role, children }) {
  const { user, isAuthenticated } = useAppStore();

  if (!isAuthenticated || !user) {
    return <Navigate to="/login" replace />;
  }

  if (user.role !== role) {
    return <Navigate to={user.role === 'doctor' ? '/doctor' : '/patient'} replace />;
  }

  return children;
}

export default App;
