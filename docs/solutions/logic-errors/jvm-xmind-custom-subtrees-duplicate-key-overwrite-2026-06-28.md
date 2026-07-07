---
title: JVM XMind custom subtree overwritten by duplicate key
date: "2026-06-28"
category: "logic-errors"
module: "xmind_auto_generation"
problem_type: logic_error
component: tooling
symptoms:
  - "JVM XMind 输出只剩线上排查视角，缺失 JVM 基础体系主干"
  - "`CUSTOM_SUBTREES` 中重复 `JVM` key，后一个子树覆盖前一个基础树"
  - "早期 QA 只证明 XMind 包结构有效，没有暴露 JVM 语义覆盖缺口"
root_cause: logic_error
resolution_type: code_fix
severity: high
related_components:
  - "markdown-source"
  - "xmind-output"
  - "qa-validation"
tags:
  - "xmind-generation"
  - "jvm"
  - "python"
  - "duplicate-dict-key"
  - "qa-evidence"
  - "knowledge-map"
---

# JVM XMind custom subtree overwritten by duplicate key

## Problem

JVM 面试知识图谱本应覆盖类加载、运行时数据区、对象模型、JIT、字节码、GC 理论、调优参数和线上排查，但实际生成的 `03_JVM运行时与线上排查.xmind` 只剩 CPU、内存、GC 日志、线程锁、Native 内存和 JFR 等线上治理节点。

问题不是 Markdown 没有 JVM 基础骨架，而是生成器中 `CUSTOM_SUBTREES` 的重复 `JVM` key 触发 Python 字典静默覆盖，使前一个完整 JVM 树被后一个排查树覆盖。

## Symptoms

- 主 Markdown 中能看到 `JVM -> 内存区域 / 对象 / GC / G1 vs ZGC / GC Barrier / 排查`，但实际 XMind 只呈现排查型分支。
- 解包 `03_JVM运行时与线上排查.xmind` 后，一级内容只有 `CPU排查`、`内存排查`、`GC日志`、`G1 vs ZGC`、`GC Barrier`、`线程锁`、`Native内存`、`JFR取证`。
- `generate_interview_xmind.py` 中存在两个 `JVM` 自定义树定义，后定义覆盖前定义。
- 第一次重构后 JVM 内容变丰富，但 QA 仍误报 L3-L5 缺证据，因为 `Mark Word`、`TLAB`、`javap`、`VM.flags`、`JFR.start`、`Compiler.codecache` 等 JVM 证据词没有被识别。

## What Didn't Work

- 只补主 Markdown 不够。源文档里有 JVM 基础枝干，但生成逻辑优先使用脚本里的自定义树，重复 key 会让 Markdown 里的结构无法进入最终 XMind。
- 只看 XMind 包结构不够。早期 QA 能证明 ZIP、`content.json`、notes coverage 和关键术语有效，但无法发现 JVM 领域语义坍缩。（session history）
- 只扩大 JVM 树不够。第一次重构后，内容已经包含体系化 JVM 节点，但 QA 证据识别规则不理解 JVM 专属证据，仍会误判缺证据。
- 不能为了通过 QA 降低标准。正确做法是让 QA 识别真实 JVM 证据，而不是把泛泛解释算作通过。

## Solution

修复分三层完成：内容层、生成层、QA 层。

### 1. 内容层：补齐 JVM 主干

在主 Markdown 中把 JVM 从窄版目录扩展为完整体系：

```text
JVM
  类加载子系统
  运行时数据区
  对象模型与分配
  执行引擎与 JIT
  字节码与栈帧
  GC 理论
  GC 收集器
  GC Barrier
  调优参数
  线上排查
```

线上排查被保留，但降级为 JVM 的一个分支，而不是 JVM 的全部。

### 2. 生成层：消除重复 key 覆盖

风险模式：

```python
CUSTOM_SUBTREES = {
    "JVM": [...完整 JVM 体系...],
    "JVM": [...线上排查样例...],
}
```

Python 字典不会报错，后一个 `JVM` 会覆盖前一个 `JVM`。

修复方向：

```python
CUSTOM_SUBTREES = {
    "JVM旧排查样例": [...旧的小型排查样例...],
    "JVM": [...完整 JVM 体系与线上排查...],
}
```

同时将文件规划从 `03_JVM运行时与线上排查.xmind` 调整为 `03_JVM体系与线上排查.xmind`，并把 priority terms 扩展为 JVM 体系词：

```python
priority_terms=[
    "ClassLoader",
    "Metaspace",
    "Mark Word",
    "TLAB",
    "JIT",
    "Code Cache",
    "GC Roots",
    "G1 GC",
    "ZGC",
    "JFR",
]
```

### 3. Evidence 层：补 JVM domain

新增 JVM 专属 domain，避免所有节点都落到泛化的 `JVM排查`：

```text
JVM体系
JVM类加载
JVM运行时数据区
JVM对象模型
JVM执行引擎
JVM字节码栈帧
JVMGC理论
JVM调优参数
JVM排查
```

每个 domain 的 notes 都要包含：

- actor：类、组件、结构、文件、系统、参数等
- operation：方法、命令或机制链路
- parameter/mechanism：参数或底层机制
- failure：失败信号
- command：可验证命令
- fix：修复动作

### 4. QA 层：识别真实 JVM 证据

`has_l3_l5_evidence()` 增加 JVM 证据类型和证据词：

```python
["结构 `", "文件 `", "系统 `", "参数 `"]
```

以及：

```text
Mark Word
Klass Pointer
TLAB fast path
Eden slow path
TieredCompilation
Compiler.codecache
Compiler.queue
Code Cache
VM.flags
VM.native_memory
GC.heap_info
-Xms
-Xmx
MaxMetaspaceSize
MaxDirectMemorySize
MaxGCPauseMillis
```

这些是 JVM 面试和线上定位中的真实证据，不是为了放宽 QA。

## Why This Works

根因是生成器配置层的静默覆盖，而不是单个知识点缺失。只补 Markdown 会被生成器覆盖；只补生成器会让 QA 误判；只补 QA 又无法保证结构完整。

这次修复把三条链路打通：

1. Markdown 定义 JVM 应该覆盖什么。
2. 生成器保证最终 XMind 使用完整 JVM 树。
3. QA 验证 L3-L5 notes 中存在真实 JVM 类名、方法、参数、命令和失败信号。

最终验收结果：

```text
passed=true
actual_count=21
expected_count=21
JVM file=03_JVM体系与线上排查.xmind
JVM topics=206
JVM notes=206
JVM max_depth=5
JVM l3_l5_missing=0
missing_four_total=0
missing_practice_total=0
forbidden_total=0
hallucinated_total=0
```

这些指标说明 JVM 已从“线上排查专题”恢复为“体系知识 + 线上治理”的完整面试知识图谱。

## Prevention

- 对大型 Python 配置字典增加重复 key 检查，尤其是 `CUSTOM_SUBTREES`、domain 映射、文件计划、QA 规则这类配置。
- 生成知识图谱时，不只验 ZIP 和 JSON 结构，还要验领域语义覆盖。结构合法不等于知识完整。
- 对核心领域建立 priority terms，JVM 不能只校验 `G1/ZGC`，还要校验 `ClassLoader`、`Metaspace`、`Mark Word`、`JIT`、`Code Cache`、`GC Roots`、`JFR`。
- 对 QA 规则保持“扩展真实证据识别，不降低标准”的原则。
- 当源文档完整但输出变窄时，优先检查生成链路中的覆盖、过滤、domain 匹配顺序和自定义树替换逻辑。

可复用检查命令：

```bash
rg -n '"JVM"\\s*:' /path/to/xmind-generation/generate_interview_xmind.py
python3 -m py_compile /path/to/xmind-generation/generate_interview_xmind.py
python3 /path/to/xmind-generation/generate_interview_xmind.py
python3 - <<'PY'
import json
from pathlib import Path
qa = json.loads(Path('/path/to/xmind-generation/output/xmind_generation_qa_report.json').read_text())
print(qa['passed'])
print(sum(len(f['l3_l5_evidence_missing']) for f in qa['files']))
PY
```

## Related Issues

- 本地 `docs/solutions/` 之前不存在，没有发现重复解决文档。
- GitHub issue 搜索跳过：`gh` 已安装但未登录，且当前仓库没有可识别的 GitHub remote。
- 会话历史补充：早期 XMind 生成曾重点验证 XMind 25.04 兼容、marker/label、ZIP/package 结构和 notes coverage，但 JVM 这次暴露出“结构 QA 通过仍可能语义坍缩”的问题。（session history）
