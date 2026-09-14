import fs from "node:fs/promises";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { Presentation, PresentationFile } from "@oai/artifact-tool";

const workspaceDir = "C:\\code_workspace\\CAPD";
const SKILL_DIR = "C:\\Users\\user\\.codex\\plugins\\cache\\openai-primary-runtime\\presentations\\26.909.12148\\skills\\presentations";
const RUNTIME_PYTHON = "C:\\Users\\user\\.cache\\codex-runtimes\\codex-primary-runtime\\dependencies\\python\\python.exe";
const buildDir = path.join(workspaceDir, ".codex-ppt-build");
const FINAL_PPTX = path.join(workspaceDir, "outputs", "CAPD_Care_발표자료.pptx");
const screenshots = "C:\\Users\\user\\Desktop\\capd";

const { resolvePresentationFont, finalizePresentation } = await import(
  pathToFileURL(path.join(SKILL_DIR, "container_tools", "artifact_tool_utils.mjs")).href,
);
const font = resolvePresentationFont({ fontFamily: "Malgun Gothic" });

const W = 1280;
const H = 720;
const c = {
  navy: "#0E1B36", ink: "#0B1F3A", blue: "#1E5EFF", pale: "#EEF4FF",
  sky: "#DCEAFF", muted: "#64748B", line: "#D9E3F2", white: "#FFFFFF",
  green: "#10B981", orange: "#F97316", purple: "#8B5CF6", paleGreen: "#E9FBF4",
};

const presentation = Presentation.create({ slideSize: { width: W, height: H } });

function rect(slide, left, top, width, height, fill, radius = 0, line = "none") {
  return slide.shapes.add({
    geometry: radius ? "roundRect" : "rect",
    position: { left, top, width, height },
    fill,
    line: line === "none" ? { fill: "none", width: 0 } : { fill: line, width: 1 },
    borderRadius: radius || undefined,
  });
}

function text(slide, value, left, top, width, height, opts = {}) {
  const s = slide.shapes.add({
    geometry: "textbox", position: { left, top, width, height }, fill: "none",
    line: { fill: "none", width: 0 },
  });
  s.text = value;
  s.text.style = {
    typeface: font, fontSize: opts.size ?? 22, color: opts.color ?? c.ink,
    bold: opts.bold ?? false, alignment: opts.align ?? "left", verticalAlignment: opts.valign ?? "top",
    autoFit: "shrinkText", marginLeft: opts.margin ?? 0, marginRight: opts.margin ?? 0,
    marginTop: opts.marginTop ?? 0, marginBottom: opts.marginBottom ?? 0,
  };
  return s;
}

async function image(slide, filename, left, top, width, height, alt, fit = "cover") {
  const source = path.join(screenshots, filename);
  const blob = await fs.readFile(source);
  return slide.images.add({
    blob, contentType: "image/png", alt, fit,
    position: { left, top, width, height }, geometry: "roundRect", borderRadius: 16,
  });
}

function header(slide, num, title, subtitle = "") {
  text(slide, `0${num}`, 56, 40, 60, 30, { size: 16, color: c.blue, bold: true });
  text(slide, title, 56, 74, 1110, 54, { size: 34, bold: true });
  if (subtitle) text(slide, subtitle, 58, 133, 1080, 32, { size: 17, color: c.muted });
  rect(slide, 56, 178, 1168, 2, c.line);
}

function footer(slide, num) {
  text(slide, "CAPD Care | 복막투석 환자 맞춤형 관리 시스템", 56, 682, 600, 18, { size: 11, color: c.muted });
  text(slide, String(num), 1190, 680, 34, 18, { size: 11, color: c.muted, align: "right" });
}

function note(slide, paths) {
  slide.speakerNotes.textFrame.setText(`화면 출처: 사용자 제공 CAPD Care 실행 화면\n${paths.map(p => `- ${path.join(screenshots, p)}`).join("\n")}`);
}

function label(slide, value, left, top, width, color = c.blue) {
  rect(slide, left, top, width, 28, color === c.green ? c.paleGreen : c.pale, 14);
  text(slide, value, left, top + 5, width, 16, { size: 12, color, bold: true, align: "center" });
}

// 1. Cover
{
  const s = presentation.slides.add();
  s.background.fill = c.navy;
  rect(s, 0, 0, 520, H, "#12264A");
  rect(s, 566, 60, 644, 600, "#FFFFFF", 24);
  await image(s, "로그인화면.png", 594, 88, 588, 544, "CAPD Care 로그인 화면", "cover");
  text(s, "CAPD Care", 62, 184, 410, 66, { size: 48, color: c.white, bold: true });
  text(s, "복막투석 환자 맞춤형\n관리 시스템", 62, 266, 420, 94, { size: 31, color: "#C9DBFF", bold: true });
  rect(s, 62, 397, 96, 4, c.blue);
  text(s, "환자 기록부터 의료진 모니터링까지", 62, 424, 370, 28, { size: 18, color: "#DDE8FF" });
  text(s, "프로젝트 발표", 62, 616, 160, 24, { size: 15, color: "#A9C2F5" });
  note(s, ["로그인화면.png"]);
}

// 2. Problem and objective
{
  const s = presentation.slides.add(); s.background.fill = c.white;
  header(s, 2, "문제 정의와 목표", "매일 쌓이는 복막투석 기록을 환자와 의료진이 같은 흐름에서 확인하도록 설계했습니다");
  text(s, "기록의 단절", 74, 244, 270, 40, { size: 28, bold: true });
  text(s, "환자는 매일 투석량과 건강 상태를\n기록하지만, 의료진은 변화 신호를\n한눈에 파악하기 어렵습니다.", 74, 304, 300, 104, { size: 19, color: c.muted });
  rect(s, 409, 234, 2, 274, c.line);
  text(s, "CAPD Care의 목표", 470, 244, 370, 40, { size: 28, bold: true });
  text(s, "환자 기록을 기반으로\n상태 확인, 설문, 예약, 상담을\n연결하는 관리 화면을 제공합니다.", 470, 304, 360, 104, { size: 19, color: c.muted });
  rect(s, 894, 226, 272, 210, c.pale, 24);
  text(s, "하루 기록", 924, 262, 212, 28, { size: 17, color: c.muted });
  text(s, "투석 · 건강 수치", 924, 301, 212, 34, { size: 25, bold: true, color: c.blue });
  text(s, "환자 포털과 EMR 화면에서\n각 역할에 맞게 확인", 924, 358, 210, 48, { size: 16, color: c.muted });
  footer(s, 2);
}

// 3. Service flow
{
  const s = presentation.slides.add(); s.background.fill = "#F7FAFF";
  header(s, 3, "서비스 흐름", "환자 입력이 의료진의 모니터링과 후속 진료로 이어집니다");
  const columns = [
    [74, "환자", "투석 기록, 건강 설문,\n증상 상담, 방문 일정 확인", c.blue],
    [450, "기록 데이터", "일일 건강 수치와\n투석 교환 내역을 저장", c.purple],
    [826, "의료진", "환자 현황, 차트, 설문,\n예약을 한 화면에서 관리", c.green],
  ];
  for (const [x, title, body, color] of columns) {
    rect(s, x, 253, 310, 244, c.white, 22, c.line);
    rect(s, x + 26, 280, 50, 50, color, 16);
    text(s, title, x + 94, 288, 184, 28, { size: 24, bold: true });
    text(s, body, x + 28, 360, 254, 70, { size: 18, color: c.muted });
  }
  text(s, "기록", 388, 354, 42, 28, { size: 15, color: c.blue, bold: true, align: "center" });
  text(s, "확인", 764, 354, 42, 28, { size: 15, color: c.green, bold: true, align: "center" });
  rect(s, 384, 392, 48, 3, c.blue, 2); rect(s, 760, 392, 48, 3, c.green, 2);
  text(s, "환자와 의료진의 화면을 분리하면서도 동일한 데이터 흐름을 유지", 74, 562, 1060, 34, { size: 23, bold: true, color: c.ink, align: "center" });
  footer(s, 3);
}

// 4. Patient portal
{
  const s = presentation.slides.add(); s.background.fill = c.white;
  header(s, 4, "환자 포털", "환자가 필요한 기능을 한 화면에서 빠르게 선택합니다");
  await image(s, "환자 메인.png", 56, 215, 724, 430, "CAPD Care 환자 메인 화면");
  text(s, "환자 중심 메뉴", 834, 238, 315, 36, { size: 28, bold: true });
  const items = ["투석 기록하기", "증상 상담하기", "투석 기록보기", "건강 설문 조사", "방문 일정 확인"];
  items.forEach((item, idx) => {
    rect(s, 836, 300 + idx * 55, 296, 40, idx === 0 ? c.pale : "#F8FAFC", 12);
    text(s, item, 856, 310 + idx * 55, 252, 22, { size: 17, bold: idx === 0, color: idx === 0 ? c.blue : c.ink });
  });
  footer(s, 4); note(s, ["환자 메인.png"]);
}

// 5. Patient records
{
  const s = presentation.slides.add(); s.background.fill = "#F7FAFF";
  header(s, 5, "투석 기록 입력과 확인", "교환 회차와 일일 건강 수치를 입력하고, 날짜별 기록을 다시 확인합니다");
  await image(s, "투석 기록하기.png", 62, 215, 400, 420, "투석 기록 입력 화면");
  await image(s, "투석기록 확인.png", 502, 215, 716, 420, "투석 기록 확인 화면");
  label(s, "1. 일일 기록 입력", 112, 602, 180);
  label(s, "2. 날짜별 기록 확인", 746, 602, 190);
  footer(s, 5); note(s, ["투석 기록하기.png", "투석기록 확인.png"]);
}

// 6. Patient support
{
  const s = presentation.slides.add(); s.background.fill = c.white;
  header(s, 6, "환자 지원 기능", "증상 상담, 건강 설문, 방문 일정 확인으로 진료 전 준비를 돕습니다");
  await image(s, "환자 증상 상담.png", 56, 216, 360, 402, "AI 증상 상담 화면");
  await image(s, "건강 설문 조사.png", 460, 216, 360, 402, "건강 설문 조사 화면");
  await image(s, "방문 일정 확인.png", 864, 216, 360, 402, "방문 일정 확인 화면");
  label(s, "AI 증상 상담", 145, 640, 180, c.purple);
  label(s, "건강 설문", 555, 640, 170, c.green);
  label(s, "방문 일정", 960, 640, 170, c.orange);
  footer(s, 6); note(s, ["환자 증상 상담.png", "건강 설문 조사.png", "방문 일정 확인.png"]);
}

// 7. Doctor monitoring
{
  const s = presentation.slides.add(); s.background.fill = "#F7FAFF";
  header(s, 7, "의료진 전체 환자 모니터링", "담당 환자의 최신 투석량과 건강 수치를 목록에서 비교합니다");
  await image(s, "의사 메인화면.png", 56, 207, 870, 520, "의사 전체 환자 모니터링 화면");
  rect(s, 961, 235, 230, 86, c.pale, 18);
  text(s, "담당 환자", 987, 254, 160, 20, { size: 16, color: c.muted });
  text(s, "10명", 987, 279, 160, 30, { size: 27, bold: true, color: c.blue });
  text(s, "제출 상태와\n미니 추이를 함께 표시", 961, 362, 230, 68, { size: 19, bold: true });
  text(s, "개별 환자 화면으로 이동해\n상세 기록을 확인합니다.", 961, 447, 230, 54, { size: 16, color: c.muted });
  footer(s, 7); note(s, ["의사 메인화면.png"]);
}

// 8. Patient detail
{
  const s = presentation.slides.add(); s.background.fill = c.white;
  header(s, 8, "환자 상세 현황과 차트", "한 명의 환자를 선택해 활력 징후, 투석 기록, AI 상태 분석을 확인합니다");
  await image(s, "의사환자 개별화면.png", 56, 207, 600, 470, "의사 환자 개별 화면");
  await image(s, "환자 상세 차트.png", 692, 207, 532, 470, "환자 상세 차트 화면");
  footer(s, 8); note(s, ["의사환자 개별화면.png", "환자 상세 차트.png"]);
}

// 9. Detailed record log
{
  const s = presentation.slides.add(); s.background.fill = "#F7FAFF";
  header(s, 9, "의료진 투석 기록 로그", "날짜별 교환 내역과 수치를 펼쳐 보고 상태를 검토합니다");
  await image(s, "의사 투석기록 확인.png", 58, 210, 950, 466, "의사 투석 기록 로그 화면");
  text(s, "날짜별 확인", 1050, 246, 150, 30, { size: 24, bold: true });
  text(s, "투석 교환 시간, 농도,\n주입량, 배액량, 제수량을\n날짜별로 확인합니다.", 1050, 300, 155, 82, { size: 17, color: c.muted });
  label(s, "정상 상태", 1050, 424, 140, c.green);
  footer(s, 9); note(s, ["의사 투석기록 확인.png"]);
}

// 10. Appointments
{
  const s = presentation.slides.add(); s.background.fill = c.white;
  header(s, 10, "예약 등록과 예약 목록", "의료진이 환자를 선택해 진료 일정을 등록하고 전체 예약을 관리합니다");
  await image(s, "예약등록.png", 56, 214, 556, 425, "환자 예약 등록 화면");
  await image(s, "예약확인.png", 650, 214, 574, 425, "전체 예약 내역 화면");
  label(s, "예약 등록", 240, 656, 170);
  label(s, "예약 내역 관리", 866, 656, 180, c.green);
  footer(s, 10); note(s, ["예약등록.png", "예약확인.png"]);
}

// 11. Surveys
{
  const s = presentation.slides.add(); s.background.fill = "#F7FAFF";
  header(s, 11, "AI 설문 승인과 응답 확인", "의료진이 진료 전 설문 문항을 검토하고 환자의 응답을 확인합니다");
  await image(s, "AI 설문 생성.png", 56, 214, 566, 425, "AI 설문 승인 및 관리 화면");
  await image(s, "AI 설문 확인.png", 658, 214, 566, 425, "설문 응답 확인 화면");
  label(s, "문항 승인 및 관리", 236, 656, 190, c.purple);
  label(s, "응답 확인", 866, 656, 170, c.green);
  footer(s, 11); note(s, ["AI 설문 생성.png", "AI 설문 확인.png"]);
}

// 12. AI report
{
  const s = presentation.slides.add(); s.background.fill = c.white;
  header(s, 12, "AI 건강 상태 분석 리포트", "기간별 건강 지표를 보고서 형태로 정리해 진료 시 참고합니다");
  await image(s, "ai보고서.png", 80, 205, 770, 466, "AI 건강 상태 분석 리포트 화면");
  text(s, "보고서 구성", 920, 238, 240, 34, { size: 27, bold: true });
  text(s, "• 기간별 주요 지표 추이\n\n• 체중, 혈압, 공복혈당, 제수량\n\n• 저장 및 PDF 내보내기", 920, 305, 250, 170, { size: 18, color: c.muted });
  rect(s, 920, 522, 222, 74, c.pale, 18);
  text(s, "의료진 검토를 위한\n참고용 요약 화면", 940, 539, 182, 42, { size: 16, bold: true, color: c.blue, align: "center" });
  footer(s, 12); note(s, ["ai보고서.png"]);
}

// 13. Implementation and close
{
  const s = presentation.slides.add(); s.background.fill = c.navy;
  text(s, "구현 구성", 58, 56, 300, 44, { size: 34, bold: true, color: c.white });
  text(s, "프론트엔드만으로도 발표 시연이 가능하도록 목업 API와 저장소를 구성했습니다", 58, 112, 940, 28, { size: 17, color: "#C9DBFF" });
  const blocks = [
    [58, "React + Vite", "화면과 사용자 흐름 구현"],
    [360, "Mock API", "백엔드 없이 데이터 요청 재현"],
    [662, "Local Storage", "입력, 설문, 승인 상태 유지"],
    [964, "데모 데이터", "10명 환자, 3,650일 기록,\n18,250건 교환 내역"],
  ];
  for (const [x, title, body] of blocks) {
    rect(s, x, 224, 254, 190, "#17315E", 20);
    text(s, title, x + 24, 252, 206, 28, { size: 22, bold: true, color: c.white });
    text(s, body, x + 24, 310, 206, 62, { size: 16, color: "#C9DBFF" });
  }
  rect(s, 58, 530, 1164, 2, "#315790");
  text(s, "CAPD Care", 58, 570, 350, 44, { size: 35, bold: true, color: c.white });
  text(s, "환자의 일상 기록을 의료진의 진료 판단에 연결합니다", 58, 627, 760, 30, { size: 20, color: "#C9DBFF" });
  note(s, []);
}

await fs.mkdir(buildDir, { recursive: true });
await fs.mkdir(path.dirname(FINAL_PPTX), { recursive: true });
const candidatePath = path.join(buildDir, "candidate.pptx");
await (await PresentationFile.exportPptx(presentation)).save(candidatePath);

const requirements = { explicitTotalSlideCount: 13, requiredNativeTableOwnerSlides: [], requiredNativeChartOwnerSlides: [] };
const result = await finalizePresentation({
  ...requirements,
  workspaceDir,
  candidatePath,
  finalPath: FINAL_PPTX,
  pythonExecutable: RUNTIME_PYTHON,
  integrityValidatorPath: path.join(SKILL_DIR, "container_tools", "inspect_presentation_package_integrity.py"),
  layoutValidatorPath: path.join(SKILL_DIR, "container_tools", "inspect_presentation_layout_geometry.py"),
  layoutArgs: ["--expected-slide-size-emu", "12192000,6858000", "--validate-bullet-geometry", "--validate-heading-fit"],
  fontPolicy: { basis: "design", families: [font] },
  verifyArtifactToolImport: true,
  receiptPath: path.join(buildDir, "CAPD_Care_발표자료.validation.json"),
});

for (let i = 0; i < presentation.slides.items.length; i++) {
  const png = await presentation.export({ slide: presentation.slides.items[i], format: "png", scale: 1 });
  await fs.writeFile(path.join(buildDir, `slide-${i + 1}.png`), new Uint8Array(await png.arrayBuffer()));
}
const montage = await presentation.export({ format: "webp", montage: true, scale: 1 });
await fs.writeFile(path.join(buildDir, "montage.webp"), new Uint8Array(await montage.arrayBuffer()));
console.log(JSON.stringify({ finalPath: result.finalPath ?? FINAL_PPTX, font, slideCount: presentation.slides.items.length }, null, 2));
