import React, { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { reservationApi } from '../../api/apiClient';
import { RESERVATION_TYPE_LABELS, toDateKey, toDateTimeInputValue } from '../../api/adapters';
import { useDoctorPatientProfile, useDoctorPatients } from '../../hooks/usePatientData';
import { formatAge } from '../../utils/ageFormat';

const appointmentTypes = [
  { value: 'REGULAR_CHECKUP', label: RESERVATION_TYPE_LABELS.REGULAR_CHECKUP, description: '정기 검진과 결과 상담을 함께 진행합니다.' },
  { value: 'BLOOD_TEST_CONSULTATION', label: RESERVATION_TYPE_LABELS.BLOOD_TEST_CONSULTATION, description: '혈액 검사 결과를 확인하고 상담합니다.' },
  { value: 'DIALYSIS_TUBE_INSPECTION', label: RESERVATION_TYPE_LABELS.DIALYSIS_TUBE_INSPECTION, description: '투석관 상태와 소독 여부를 점검합니다.' },
  { value: 'PRESCRIPTION_MANAGEMENT', label: RESERVATION_TYPE_LABELS.PRESCRIPTION_MANAGEMENT, description: '투석액과 처방 내용을 관리합니다.' },
];

const isHalfHourTime = (time = '') => {
  const [, minute = ''] = String(time).split(':');
  return minute === '00' || minute === '30';
};

const hourOptions = Array.from({ length: 12 }, (_, index) => String(index + 1).padStart(2, '0'));
const minuteOptions = ['00', '30'];

const getTimeParts = (time = '09:00') => {
  const [hour = '09', minute = '00'] = String(time).split(':');
  const hourNumber = Number(hour);
  const hour12 = hourNumber % 12 || 12;

  return {
    period: hourNumber >= 12 ? 'PM' : 'AM',
    hour: String(hour12).padStart(2, '0'),
    minute: minuteOptions.includes(minute) ? minute : '00',
  };
};

const toTimeValue = ({ period, hour, minute }) => {
  const hourNumber = Number(hour);
  const hour24 = period === 'AM'
    ? hourNumber === 12 ? 0 : hourNumber
    : hourNumber === 12 ? 12 : hourNumber + 12;

  return `${String(hour24).padStart(2, '0')}:${minute}`;
};

export default function AppointmentCreatePage() {
  const navigate = useNavigate();
  const { data: assignedPatients = [] } = useDoctorPatients();
  const todayKey = toDateKey(new Date());

  const [formData, setFormData] = useState({
    patientId: '',
    date: todayKey,
    time: '09:00',
    type: 'REGULAR_CHECKUP',
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const selectedPatient = useMemo(() => (
    assignedPatients.find(patient => String(patient.id) === String(formData.patientId)) || assignedPatients[0]
  ), [assignedPatients, formData.patientId]);
  const { data: selectedPatientProfile, isLoading: isPatientProfileLoading } = useDoctorPatientProfile(selectedPatient?.id);
  const displayPatient = useMemo(() => (
    mergePatientProfile(selectedPatient, selectedPatientProfile)
  ), [selectedPatient, selectedPatientProfile]);
  const selectedAppointmentType = appointmentTypes.find(type => type.value === formData.type) || appointmentTypes[0];

  React.useEffect(() => {
    if (!formData.patientId && assignedPatients[0]?.id) {
      setFormData(prev => ({ ...prev, patientId: assignedPatients[0].id }));
    }
  }, [assignedPatients, formData.patientId]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.patientId) {
      alert('예약할 환자를 선택해 주세요.');
      return;
    }

    if (formData.date < todayKey) {
      alert('오늘 이전 날짜로는 예약을 등록할 수 없습니다.');
      return;
    }

    if (!isHalfHourTime(formData.time)) {
      alert('예약 시간은 30분 단위로 선택해 주세요.');
      return;
    }

    setIsSubmitting(true);

    try {
      const reservation = await reservationApi.create({
        patientId: Number(formData.patientId),
        reservationDate: toDateTimeInputValue(formData.date, formData.time),
        type: formData.type,
      });

      window.dispatchEvent(new CustomEvent('capd:reservations-changed', {
        detail: { date: formData.date, reservation },
      }));

      alert('환자 예약이 등록되었습니다.');
      navigate('/doctor/appointments/check');
    } catch (error) {
      alert(error.message || '예약 등록에 실패했습니다.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex h-full min-h-0 min-w-0 flex-col overflow-y-auto bg-slate-50 p-4 animate-in fade-in duration-500 custom-scrollbar">
      <div className="mb-3 flex shrink-0 flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="text-xs font-black text-blue-600">APPOINTMENT</div>
          <h1 className="mt-1 text-2xl font-black text-slate-900">환자 예약 등록</h1>
          <p className="mt-1 text-sm font-medium text-slate-500">
            담당 환자를 선택하고 진료 예약 일정을 등록합니다.
          </p>
        </div>

        <button
          type="button"
          onClick={() => navigate('/doctor')}
          className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-black text-slate-500 shadow-sm hover:bg-slate-50"
        >
          목록으로 돌아가기
        </button>
      </div>

      <form onSubmit={handleSubmit} className="grid min-h-0 min-w-0 flex-1 grid-cols-1 items-stretch gap-4 xl:grid-cols-12">
        <section className="flex min-h-0 min-w-0 flex-col rounded-2xl border border-slate-100 bg-white p-4 shadow-sm xl:col-span-7">
          <div className="mb-3 shrink-0 border-b border-slate-100 pb-3">
            <h2 className="text-base font-black text-slate-900">예약 정보 입력</h2>
            <p className="mt-1 text-xs font-bold text-slate-400">
              환자, 날짜, 시간, 예약 유형을 선택하세요.
            </p>
          </div>

          <div className="grid min-h-0 min-w-0 flex-1 gap-3 xl:grid-rows-[auto_auto_1fr]">
            <section className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
              <Field label="환자 선택">
                <select
                  name="patientId"
                  value={formData.patientId}
                  onChange={handleChange}
                  className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-base font-black outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                  required
                >
                  {assignedPatients.map(patient => (
                    <option key={patient.id} value={patient.id}>
                      {patient.name} 환자 ({patient.sex}/{formatAge(patient.age)})
                    </option>
                  ))}
                </select>
              </Field>
            </section>

            <section className="grid grid-cols-1 gap-3 lg:grid-cols-2">
              <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
                <Field label="예약 날짜">
                  <input
                    type="date"
                    name="date"
                    value={formData.date}
                    min={todayKey}
                    onChange={handleChange}
                    className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-base font-black outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                    required
                  />
                </Field>
              </div>

              <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
                <Field label="예약 시간">
                  <HalfHourTimeSelect
                    value={formData.time}
                    onChange={(time) => setFormData(prev => ({ ...prev, time }))}
                  />
                </Field>
              </div>
            </section>

            <section className="flex min-h-0 flex-col rounded-2xl border border-slate-100 bg-slate-50 p-4">
              <div className="mb-3 shrink-0">
                <div className="text-sm font-black text-slate-700">예약 유형</div>
                <div className="mt-1 text-xs font-bold text-slate-400">진료 목적에 맞는 유형을 선택하세요.</div>
              </div>

              <div className="grid min-h-0 min-w-0 flex-1 grid-cols-1 gap-3 lg:grid-cols-2 xl:grid-rows-2">
                {appointmentTypes.map(type => {
                  const isActive = formData.type === type.value;

                  return (
                    <button
                      key={type.value}
                      type="button"
                      onClick={() => setFormData(prev => ({ ...prev, type: type.value }))}
                      className={`rounded-2xl border p-4 text-left transition-all ${
                        isActive
                          ? 'border-blue-500 bg-blue-50 shadow-sm ring-2 ring-blue-100'
                          : 'border-slate-200 bg-white hover:border-blue-200 hover:bg-blue-50/50'
                      }`}
                    >
                      <div className={`text-base font-black ${isActive ? 'text-blue-700' : 'text-slate-900'}`}>
                        {type.label}
                      </div>
                      <div className="mt-2 text-xs font-bold text-slate-400">
                        {type.description}
                      </div>
                    </button>
                  );
                })}
              </div>
            </section>
          </div>
        </section>

        <aside className="grid min-h-0 min-w-0 gap-4 xl:col-span-5 xl:grid-rows-[minmax(min-content,1fr)_auto]">
          <section className="flex min-h-fit min-w-0 flex-col rounded-2xl border border-slate-100 bg-white p-4 shadow-sm">
            <h2 className="mb-3 shrink-0 text-base font-black text-slate-900">예약 대상 환자</h2>

            {displayPatient ? (
              <div className="flex min-h-fit flex-1 flex-col gap-4 rounded-2xl bg-slate-50 p-5">
                <div>
                  <div className="flex items-center gap-4">
                    <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-blue-100 text-2xl font-black text-blue-600">
                      {displayPatient.name.charAt(0)}
                    </div>
                    <div className="min-w-0">
                      <div className="truncate text-xl font-black text-slate-900">{displayPatient.name}</div>
                      <div className="mt-1 text-sm font-bold text-slate-400">
                        {displayPatient.sex}/{formatAge(displayPatient.age)}
                      </div>
                    </div>
                  </div>

                  <div className="mt-5 grid grid-cols-1 gap-3 lg:grid-cols-2">
                    <InfoBox label="전화번호" value={displayPatient.phone} isLoading={isPatientProfileLoading} />
                    <InfoBox label="이메일" value={displayPatient.email} isLoading={isPatientProfileLoading} />
                  </div>
                </div>

                <div className="rounded-2xl border border-slate-200 bg-white p-4">
                  <div className="text-xs font-black text-slate-400">예약 방식</div>
                  <p className="mt-2 text-sm font-bold leading-relaxed text-slate-600">
                    의사가 담당 환자를 선택하여 예약을 등록합니다.
                  </p>
                </div>
              </div>
            ) : (
              <div className="flex flex-1 items-center justify-center rounded-2xl border border-dashed border-slate-200 bg-slate-50 text-sm font-bold text-slate-400">
                선택 가능한 담당 환자가 없습니다.
              </div>
            )}
          </section>

          <section className="flex min-h-0 min-w-0 flex-col rounded-2xl border border-blue-100 bg-blue-50 p-4 shadow-sm">
            <div className="mb-3 shrink-0 text-xs font-black text-blue-600">예약 미리보기</div>

            <div className="grid min-h-0 min-w-0 grid-cols-1 gap-3 lg:grid-cols-2">
              <div className="rounded-2xl bg-white p-5 shadow-sm">
                <div className="text-sm font-black text-slate-400">예약 일시</div>
                <div className="mt-3 text-xl font-black text-slate-900 2xl:text-2xl">{formData.date}</div>
                <div className="mt-1 text-xl font-black text-blue-700 2xl:text-2xl">{formData.time}</div>
              </div>

              <div className="rounded-2xl border border-blue-100 bg-white/80 p-5">
                <div className="text-sm font-black text-slate-400">예약 내용</div>
                <div className="mt-3 truncate text-xl font-black text-slate-900">
                  {displayPatient?.name || '환자'}
                </div>
                <div className="mt-3 w-fit rounded-full bg-blue-100 px-3 py-1 text-sm font-black text-blue-700">
                  {selectedAppointmentType.label}
                </div>
              </div>
            </div>

            <button
              type="submit"
              disabled={isSubmitting || assignedPatients.length === 0}
              className="mt-4 shrink-0 w-full rounded-2xl bg-blue-600 py-4 text-base font-black text-white shadow-lg transition-all hover:bg-blue-700 active:scale-[0.99] disabled:bg-slate-300"
            >
              {isSubmitting ? '예약 등록 중' : '예약 등록하기'}
            </button>
          </section>
        </aside>
      </form>
    </div>
  );
}

function mergePatientProfile(patient, profile) {
  if (!patient) return null;
  if (!profile) return patient;

  return {
    ...patient,
    ...profile,
    email: preferProfileValue(profile.email, patient.email),
    phone: preferProfileValue(profile.phone, patient.phone),
  };
}

function preferProfileValue(profileValue, fallbackValue) {
  if (profileValue === undefined || profileValue === null || profileValue === '' || profileValue === '-') {
    return fallbackValue || '-';
  }

  return profileValue;
}

function Field({ label, children }) {
  return (
    <label className="block">
      <div className="mb-2 text-sm font-black text-slate-700">{label}</div>
      {children}
    </label>
  );
}

function HalfHourTimeSelect({ value, onChange }) {
  const parts = getTimeParts(value);

  const updateTime = (key, nextValue) => {
    onChange(toTimeValue({ ...parts, [key]: nextValue }));
  };

  const selectClass = 'min-w-0 w-full rounded-xl border border-slate-200 bg-white px-2 py-3 text-center text-sm font-black outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 2xl:text-base';

  return (
    <div className="grid min-w-0 grid-cols-[minmax(0,1fr)_minmax(0,1fr)_minmax(0,1fr)] gap-2">
      <select
        aria-label="오전 오후"
        value={parts.period}
        onChange={(event) => updateTime('period', event.target.value)}
        className={selectClass}
      >
        <option value="AM">오전</option>
        <option value="PM">오후</option>
      </select>

      <select
        aria-label="예약 시"
        value={parts.hour}
        onChange={(event) => updateTime('hour', event.target.value)}
        className={selectClass}
      >
        {hourOptions.map(hour => (
          <option key={hour} value={hour}>{hour}</option>
        ))}
      </select>

      <select
        aria-label="예약 분"
        value={parts.minute}
        onChange={(event) => updateTime('minute', event.target.value)}
        className={selectClass}
      >
        {minuteOptions.map(minute => (
          <option key={minute} value={minute}>{minute}</option>
        ))}
      </select>
    </div>
  );
}

function InfoBox({ label, value, isLoading = false }) {
  const displayValue = isLoading && (!value || value === '-') ? '조회 중' : value;

  return (
    <div className="rounded-xl border border-slate-200 bg-white px-3 py-3">
      <div className="text-[11px] font-black text-slate-400">{label}</div>
      <div className="mt-1 wrap-break-word text-xs font-black text-slate-800">{displayValue || '-'}</div>
    </div>
  );
}
