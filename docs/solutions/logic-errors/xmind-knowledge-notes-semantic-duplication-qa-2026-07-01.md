---
title: XMind knowledge notes semantic duplication escaped QA
date: "2026-07-01"
category: "logic-errors"
module: "xmind_auto_generation"
problem_type: logic_error
component: qa-validation
symptoms:
  - "XMind 自动 QA 通过，但用户抽样发现 DispatcherServlet 等节点 notes 高度重复"
  - "普通技术节点出现统一回答锚点模板，缺少节点自己的源码、机制和失败分支"
  - "全量扫描发现多个领域存在相邻节点 notes 高相似"
root_cause: logic_error
resolution_type: code_fix
severity: high
related_components:
  - "generate_interview_xmind.py"
  - "xmind-output"
  - "semantic-qa"
tags:
  - "xmind-generation"
  - "semantic-duplication"
  - "qa-false-positive"
  - "knowledge-map"
  - "interview-material"
---

# XMind knowledge notes semantic duplication escaped QA

## Problem

面试知识图谱的 `.xmind` 文件数量、节点深度、notes 覆盖率和基础 QA 都通过，但用户抽样 `Spring -> MVC -> 请求分发 -> DispatcherServlet` 后发现：多个子节点 notes 高度重复，且普通技术节点混入了“回答锚点/回答组织”式套话。

问题不是单个节点漏写，而是生成器对相邻节点使用了同一套泛化 evidence，QA 又没有检查兄弟节点 notes 相似度，导致“结构 PASS、内容复读”的假阳性。

## Symptoms

- `DispatcherServlet`、`doDispatch()`、`HandlerMapping`、`HandlerAdapter` 的 notes 都在讲同一段 `doDispatch` 失败分支。
- 普通技术节点出现类似“先讲业务背景和负责边界”的表达模板。
- 全量扫描相邻节点后，早期版本出现大量高相似兄弟节点和父子节点。
- `xmind_generation_qa_report.json` 仍显示 `passed=true`，说明 QA 覆盖了结构，没有覆盖语义重复。

## What Didn't Work

- 只看 `passed=true` 不够。它只能证明 XMind 包结构、notes 覆盖和部分证据词达标。
- 只抽样 MVC 不够。Spring、JVM、ES、MQ、Agent、JD 护栏等领域都可能出现相同模式。
- 只手改 XMind 不够。重新运行生成器会覆盖手工修复。
- 只把重复词加入黑名单不够。很多复读内容没有固定关键词，必须做相似度比较。

## Solution

修复分三层完成。

### 1. 生成层：为高相似簇补节点专属 notes

在 `/path/to/xmind-generation/generate_interview_xmind.py` 中扩展 `targeted_similarity_note_for_node()`，对高风险节点按统一结构生成专属内容：

```text
节点差异
源码/对象
运行机制
边界参数
失败信号
取证方式
追问练习
```

覆盖的重点领域：

- Spring MVC 请求链、全局异常、Validation、Actuator、事务失效
- Java Atomic、TreeMap、Lock/AQS
- JVM invoke、NMT、DirectOOM、类加载链接/初始化、Metaspace
- Spring IoC 三级缓存
- ES mapping/routing/doc_values/字段爆炸
- MQ confirm 回调、本地消息表
- Agent Tool/LLM/Prompt
- JD 护栏、搜索交易链路、MQ 治理

### 2. 模板层：去掉复盘口径复读

将 `note_for_node()` 里的通用复盘话术：

```text
输出要求：形成 ready/todo/do_not_claim 三类结果，避免把学习计划包装成真实项目经历。
```

替换为按标题变化的交付物：

```text
机制复盘 -> 3 条机制链路
源码入口 -> 类、方法签名、关键字段和版本差异
异常类型 -> 异常类、触发条件、日志特征和修复动作
排查命令 -> 命令、预期输出字段、异常判定条件和下一步动作
项目经验 -> 真实接口/表/topic/指标/面板/事故复盘路径
```

这样复盘节点仍有边界，但不再每个节点重复同一句话。

### 3. QA 层：加入全局相邻节点近重复检测

在 `qa_xmind_files()` 中新增：

```text
semantic_near_duplicate_notes
```

规则：

- 同一父节点下，任意两个子节点 notes 相似度 `>= 0.97`，直接判失败。
- MVC 子树保留专项字段 `mvc_near_duplicate_notes`。
- 禁用模板仍由 `contains_forbidden_filler()` 拦截。

最终 QA 结果：

```text
passed=True
actual_count=21
expected_count=21
semantic_near_duplicate_notes=0
mvc_near_duplicate_notes=0
forbidden_filler=0
l3_l5_evidence_missing=0
```

独立扫描结果：

```text
scan files=21
sibling>=0.82=18
exact>=0.97=0
parent>=0.86=0
forbidden_answer_template=0
```

## Why This Works

这次修复把“内容质量”从人工抽样变成了生成器约束和 QA 约束：

1. 生成器不再为高风险节点继承同一份泛化 evidence。
2. 模板层不再把面试表达话术灌进技术节点。
3. QA 能拦截全局兄弟节点复制粘贴，而不是只检查 MVC 或 notes 覆盖。
4. 每次重新生成都会保留修复，因为改的是源生成逻辑。

## Prevention

后续大规模生成知识图谱时，必须增加语义重复验收：

```bash
python3 -m py_compile /path/to/xmind-generation/generate_interview_xmind.py
python3 /path/to/xmind-generation/generate_interview_xmind.py
python3 - <<'PY'
import json
from pathlib import Path
qa = json.loads(Path('/path/to/xmind-generation/output/xmind_generation_qa_report.json').read_text())
print(qa['passed'])
print(sum(len(f.get('semantic_near_duplicate_notes', [])) for f in qa['files']))
print(sum(len(f.get('mvc_near_duplicate_notes', [])) for f in qa['files']))
print(sum(len(f.get('forbidden_filler', [])) for f in qa['files']))
PY
```

判定规则：

- `semantic_near_duplicate_notes > 0`：打回。
- `mvc_near_duplicate_notes > 0`：打回。
- 技术节点命中“回答锚点/回答组织/先讲业务背景”：打回。
- 只能通过补节点专属 notes 修复，不能降低相似度阈值或删除 QA。
