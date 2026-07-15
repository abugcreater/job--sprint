import { fireEvent, render, screen } from "@testing-library/react";
import { App } from "../App";
import { getScheduleData, buildTodaySprint } from "../data/scheduleAdapter";
import { useSprintStore } from "../stores/sprintStore";
import type { CoachScheduleEvent, UserProfile } from "../types/sprint";

const fixedNow = new Date("2026-07-02T10:00:00+08:00");

const qaProfile: UserProfile = {
  id: "profile-qa",
  name: "测试开发工程师求职画像",
  roleFamily: "qa",
  targetRole: "测试开发工程师",
  targetLevel: "6年",
  cities: "杭州、上海",
  salaryTarget: "28-35K",
  companyTypes: "互联网平台",
  experienceSummary: "6 年测试平台和接口自动化经验。",
  projectEvidence: "质量平台、CI 稳定性和缺陷归因。",
  nonClaims: "不包装算法训练经验。",
  dailyMinutes: 60,
  active: true,
  createdAt: "2026-07-02T09:00:00+08:00",
  updatedAt: "2026-07-02T09:00:00+08:00"
};

const qaScheduleEvent: CoachScheduleEvent = {
  id: "event-qa-1",
  profileId: "profile-qa",
  date: "2026-07-02",
  start: "09:30",
  end: "11:30",
  kind: "learning",
  title: "补 缺陷归因 面试表达",
  reason: "围绕测试开发画像补齐缺陷归因证据。",
  evidenceRequired: true,
  createdAt: "2026-07-02T09:00:00+08:00",
  updatedAt: "2026-07-02T09:00:00+08:00"
};

function resetStoreWithGeneratedCalendar() {
  const completed = {};
  const evidenceByTaskId = {};
  const coachScheduleEvents = [qaScheduleEvent];
  useSprintStore.setState({
    completed,
    evidenceByTaskId,
    delayRecords: [],
    userProfiles: [qaProfile],
    knowledgeBoundaries: [],
    boundarySuggestionFeedback: [],
    coachScheduleEvents,
    aiArtifacts: [],
    llmRuns: [],
    syncState: "local_fallback",
    lastSavedAt: undefined,
    sprint: buildTodaySprint(getScheduleData(), fixedNow, {
      completed,
      evidenceByTaskId,
      syncState: "local_fallback",
      coachScheduleEvents,
      activeProfileId: qaProfile.id
    })
  });
}

describe("React Job Sprint today workspace", () => {
  beforeEach(() => {
    window.location.hash = "#/today";
    window.localStorage.clear();
    const completed = {};
    const evidenceByTaskId = {};
    useSprintStore.setState({
      completed,
      evidenceByTaskId,
      delayRecords: [],
      userProfiles: [],
      knowledgeBoundaries: [],
      boundarySuggestionFeedback: [],
      coachScheduleEvents: [],
      aiArtifacts: [],
      llmRuns: [],
      syncState: "local_fallback",
      lastSavedAt: undefined,
      sprint: buildTodaySprint(getScheduleData(), fixedNow, { completed, evidenceByTaskId, syncState: "local_fallback" })
    });
  });

  it("shows onboarding instead of demo tasks before a profile is generated", () => {
    render(<App />);

    expect(screen.getByRole("heading", { name: "今日 AI 教练" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "先导入真实经历，再开始今天的求职推进。" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /导入简历或 JD/ })).toHaveAttribute("href", "#/coach?entry=resume-import");
    expect(screen.getByText("三步进入今天的行动")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "重试同步" })).not.toBeInTheDocument();
    expect(screen.queryByText(/Spring 事务/)).not.toBeInTheDocument();
    expect(screen.queryByText("今日风险")).not.toBeInTheDocument();
    expect(screen.queryByText("Evidence Gate（证据门）")).not.toBeInTheDocument();
  });

  it("requires evidence before marking the generated current task complete", async () => {
    resetStoreWithGeneratedCalendar();
    render(<App />);

    expect(screen.getByRole("heading", { name: "补 缺陷归因 面试表达" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "先补证据" })).toBeDisabled();

    fireEvent.click(screen.getByRole("button", { name: "补学习笔记" }));
    expect(screen.getByLabelText("证据类型")).toHaveFocus();
    fireEvent.change(screen.getByLabelText("证据内容"), {
      target: { value: "手动学习笔记：质量平台缺陷归因、CI 稳定性指标和 Mock 边界已经整理成面试表达。" }
    });
    fireEvent.click(screen.getByRole("button", { name: "保存证据" }));

    expect(await screen.findByText("学习笔记证据")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "补学习笔记" })).toHaveFocus();
    expect(screen.getByText(/质量平台缺陷归因/)).toBeInTheDocument();
    const completeButton = screen.getByRole("button", { name: "标记完成" });
    expect(completeButton).toBeEnabled();

    fireEvent.click(completeButton);

    expect(screen.getByRole("button", { name: "取消完成" })).toBeInTheDocument();
  });

  it("records oral text, delay feedback and opens compact evidence details", async () => {
    resetStoreWithGeneratedCalendar();
    render(<App />);

    fireEvent.click(screen.getByRole("button", { name: "补学习笔记" }));
    fireEvent.change(screen.getByLabelText("证据内容"), { target: { value: "第一条学习证据，来自测试输入。" } });
    fireEvent.click(screen.getByRole("button", { name: "保存证据" }));

    fireEvent.click(screen.getByRole("button", { name: "记录口述" }));
    fireEvent.change(screen.getByLabelText("证据内容"), { target: { value: "第二条口述证据，来自 Evidence Gate 输入。" } });
    fireEvent.click(screen.getByRole("button", { name: "保存证据" }));

    fireEvent.click(screen.getByRole("button", { name: "补学习笔记" }));
    fireEvent.change(screen.getByLabelText("证据内容"), { target: { value: "第三条学习证据，来自 Evidence Gate 输入。" } });
    fireEvent.click(screen.getByRole("button", { name: "保存证据" }));

    fireEvent.click(screen.getByRole("button", { name: "补学习笔记" }));
    fireEvent.change(screen.getByLabelText("证据内容"), { target: { value: "第四条学习证据，验证证据列表。" } });
    fireEvent.click(screen.getByRole("button", { name: "保存证据" }));

    fireEvent.click(screen.getByRole("button", { name: "记录口述" }));
    fireEvent.change(screen.getByLabelText("证据内容"), { target: { value: "第五条口述证据，验证查看全部。" } });
    fireEvent.click(screen.getByRole("button", { name: "保存证据" }));

    expect(await screen.findByRole("button", { name: /查看全部证据（5）/ })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /查看全部证据（5）/ }));
    fireEvent.click(screen.getAllByRole("button", { name: /展开详情/ })[0]);
    expect(screen.getAllByText(/第五条口述证据/).length).toBeGreaterThan(0);

    fireEvent.click(screen.getByRole("button", { name: "开始口述一题" }));
    fireEvent.change(screen.getByLabelText("口述文本记录"), {
      target: { value: "文本口述：先讲结论，再讲链路、异常分支、指标和复盘动作。" }
    });
    fireEvent.click(screen.getByRole("button", { name: "保存口述证据" }));
    expect(await screen.findByText("已保存口述文本，并写入 Evidence Gate。")).toBeInTheDocument();
    expect(screen.getByText(/文本口述/)).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "登记延期" }));
    expect(await screen.findByText("请填写延期原因和补救动作。")).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText("延期分钟"), { target: { value: "45" } });
    fireEvent.change(screen.getByLabelText("延期原因"), { target: { value: "测试登记延期原因" } });
    fireEvent.change(screen.getByLabelText("补救动作"), { target: { value: "测试补救动作" } });
    fireEvent.click(screen.getByRole("button", { name: "登记延期" }));
    expect(await screen.findByText(/已登记延期：45 分钟，测试登记延期原因。/)).toBeInTheDocument();
    expect(screen.getByText("45 分钟 · 测试登记延期原因")).toBeInTheDocument();
  });
});
