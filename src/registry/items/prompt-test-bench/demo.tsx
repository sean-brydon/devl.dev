import { PromptTestBench } from "@/registry/items/prompt-test-bench/prompt-test-bench";

export default function PromptTestBenchDemo() {
  return <PromptTestBench defaultPrompt="refund-reply" threshold={0.8} workspace="Lumen Labs" />;
}
