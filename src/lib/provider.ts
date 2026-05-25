import { anthropic } from "@ai-sdk/anthropic";
import {
  LanguageModelV1,
  LanguageModelV1StreamPart,
  LanguageModelV1Message,
} from "@ai-sdk/provider";

const MODEL = "claude-haiku-4-5";

export class MockLanguageModel implements LanguageModelV1 {
  readonly specificationVersion = "v1" as const;
  readonly provider = "mock";
  readonly modelId: string;
  readonly defaultObjectGenerationMode = "tool" as const;

  constructor(modelId: string) {
    this.modelId = modelId;
  }

  private async delay(ms: number) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  private extractUserPrompt(messages: LanguageModelV1Message[]): string {
    // Find the last user message
    for (let i = messages.length - 1; i >= 0; i--) {
      const message = messages[i];
      if (message.role === "user") {
        const content = message.content;
        if (Array.isArray(content)) {
          // Extract text from content parts
          const textParts = content
            .filter((part: any) => part.type === "text")
            .map((part: any) => part.text);
          return textParts.join(" ");
        } else if (typeof content === "string") {
          return content;
        }
      }
    }
    return "";
  }

  private getLastToolResult(messages: LanguageModelV1Message[]): any {
    // Find the last tool message
    for (let i = messages.length - 1; i >= 0; i--) {
      if (messages[i].role === "tool") {
        const content = messages[i].content;
        if (Array.isArray(content) && content.length > 0) {
          return content[0];
        }
      }
    }
    return null;
  }

  private async *generateMockStream(
    messages: LanguageModelV1Message[],
    userPrompt: string
  ): AsyncGenerator<LanguageModelV1StreamPart> {
    // Count tool messages to determine which step we're on
    const toolMessageCount = messages.filter((m) => m.role === "tool").length;

    // Determine component type from the original user prompt
    const promptLower = userPrompt.toLowerCase();
    let componentType = "counter";
    let componentName = "Counter";

    if (promptLower.includes("form")) {
      componentType = "form";
      componentName = "ContactForm";
    } else if (promptLower.includes("card")) {
      componentType = "card";
      componentName = "Card";
    }

    // Step 1: Create component file
    if (toolMessageCount === 1) {
      const text = `I'll create a ${componentName} component for you.`;
      for (const char of text) {
        yield { type: "text-delta", textDelta: char };
        await this.delay(25);
      }

      yield {
        type: "tool-call",
        toolCallType: "function",
        toolCallId: `call_1`,
        toolName: "str_replace_editor",
        args: JSON.stringify({
          command: "create",
          path: `/components/${componentName}.jsx`,
          file_text: this.getComponentCode(componentType),
        }),
      };

      yield {
        type: "finish",
        finishReason: "tool-calls",
        usage: {
          promptTokens: 50,
          completionTokens: 30,
        },
      };
      return;
    }

    // Step 2: Enhance component
    if (toolMessageCount === 2) {
      const text = `Now let me enhance the component with better styling.`;
      for (const char of text) {
        yield { type: "text-delta", textDelta: char };
        await this.delay(25);
      }

      yield {
        type: "tool-call",
        toolCallType: "function",
        toolCallId: `call_2`,
        toolName: "str_replace_editor",
        args: JSON.stringify({
          command: "str_replace",
          path: `/components/${componentName}.jsx`,
          old_str: this.getOldStringForReplace(componentType),
          new_str: this.getNewStringForReplace(componentType),
        }),
      };

      yield {
        type: "finish",
        finishReason: "tool-calls",
        usage: {
          promptTokens: 50,
          completionTokens: 30,
        },
      };
      return;
    }

    // Step 3: Create App.jsx
    if (toolMessageCount === 0) {
      const text = `This is a static response. You can place an Anthropic API key in the .env file to use the Anthropic API for component generation. Let me create an App.jsx file to display the component.`;
      for (const char of text) {
        yield { type: "text-delta", textDelta: char };
        await this.delay(15);
      }

      yield {
        type: "tool-call",
        toolCallType: "function",
        toolCallId: `call_3`,
        toolName: "str_replace_editor",
        args: JSON.stringify({
          command: "create",
          path: "/App.jsx",
          file_text: this.getAppCode(componentName),
        }),
      };

      yield {
        type: "finish",
        finishReason: "tool-calls",
        usage: {
          promptTokens: 50,
          completionTokens: 30,
        },
      };
      return;
    }

    // Step 4: Final summary (no tool call)
    if (toolMessageCount >= 3) {
      const text = `Perfect! I've created:

1. **${componentName}.jsx** - A fully-featured ${componentType} component
2. **App.jsx** - The main app file that displays the component

The component is now ready to use. You can see the preview on the right side of the screen.`;

      for (const char of text) {
        yield { type: "text-delta", textDelta: char };
        await this.delay(30);
      }

      yield {
        type: "finish",
        finishReason: "stop",
        usage: {
          promptTokens: 50,
          completionTokens: 50,
        },
      };
      return;
    }
  }

  private getComponentCode(componentType: string): string {
    switch (componentType) {
      case "form":
        return `import { useState } from 'react';

const ContactForm = () => {
  const [formData, setFormData] = useState({ name: '', email: '', message: '' });
  const [submitted, setSubmitted] = useState(false);

  const handleChange = (e) => setFormData({ ...formData, [e.target.name]: e.target.value });

  const handleSubmit = (e) => {
    e.preventDefault();
    setSubmitted(true);
  };

  if (submitted) {
    return (
      <div className="text-center py-8">
        <div className="w-14 h-14 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <svg className="w-7 h-7 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <h3 className="text-xl font-semibold text-slate-900 mb-2">Message sent!</h3>
        <p className="text-slate-500 text-sm">We'll get back to you within 24 hours.</p>
        <button onClick={() => { setSubmitted(false); setFormData({ name: '', email: '', message: '' }); }}
          className="mt-6 text-sm text-indigo-600 hover:text-indigo-700 font-medium transition-colors">
          Send another message
        </button>
      </div>
    );
  }

  return (
    <div>
      <h2 className="text-2xl font-bold text-slate-900 mb-1">Get in touch</h2>
      <p className="text-slate-500 text-sm mb-6">We typically respond within one business day.</p>
      <form onSubmit={handleSubmit} className="space-y-5">
        <div>
          <label htmlFor="name" className="block text-sm font-medium text-slate-700 mb-1.5">Full name</label>
          <input type="text" id="name" name="name" value={formData.name} onChange={handleChange} required
            placeholder="Jane Smith"
            className="w-full px-3.5 py-2.5 border border-slate-200 rounded-lg text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-shadow" />
        </div>
        <div>
          <label htmlFor="email" className="block text-sm font-medium text-slate-700 mb-1.5">Email address</label>
          <input type="email" id="email" name="email" value={formData.email} onChange={handleChange} required
            placeholder="jane@company.com"
            className="w-full px-3.5 py-2.5 border border-slate-200 rounded-lg text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-shadow" />
        </div>
        <div>
          <label htmlFor="message" className="block text-sm font-medium text-slate-700 mb-1.5">Message</label>
          <textarea id="message" name="message" value={formData.message} onChange={handleChange} required rows={4}
            placeholder="Tell us what you're working on..."
            className="w-full px-3.5 py-2.5 border border-slate-200 rounded-lg text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-shadow resize-none" />
        </div>
        <button type="submit"
          className="w-full bg-indigo-600 text-white py-2.5 px-4 rounded-lg text-sm font-medium hover:bg-indigo-700 active:scale-95 transition-all duration-150 shadow-sm">
          Send message
        </button>
      </form>
    </div>
  );
};

export default ContactForm;`;

      case "card":
        return `import { useState } from 'react';
import { Zap, ShieldCheck, BarChart2, ChevronDown } from 'lucide-react';

const features = [
  { Icon: Zap, color: 'text-amber-500 bg-amber-50', title: 'Lightning Fast', desc: 'Built on a high-performance runtime with sub-100ms response times globally.' },
  { Icon: ShieldCheck, color: 'text-emerald-600 bg-emerald-50', title: 'Secure by Default', desc: 'End-to-end encryption and SOC 2 Type II compliance included at every tier.' },
  { Icon: BarChart2, color: 'text-indigo-600 bg-indigo-50', title: 'Real-time Analytics', desc: 'Live dashboards and instant insights across all your data sources.' },
];

const Card = () => {
  const [active, setActive] = useState(null);

  return (
    <div className="space-y-3">
      <div className="text-center mb-8">
        <span className="text-xs font-semibold text-indigo-600 tracking-widest uppercase">Platform features</span>
        <h2 className="text-3xl font-bold text-slate-900 mt-2 mb-3">Everything you need to ship</h2>
        <p className="text-slate-500 max-w-sm mx-auto text-sm leading-relaxed">
          A complete toolkit for modern teams — from prototype to production.
        </p>
      </div>
      {features.map((f, i) => (
        <div key={i} onClick={() => setActive(active === i ? null : i)}
          className={\`bg-white border rounded-2xl p-5 cursor-pointer transition-all duration-200 \${active === i ? 'border-indigo-200 shadow-md shadow-indigo-50' : 'border-slate-100 shadow-sm hover:shadow-md hover:border-slate-200'}\`}>
          <div className="flex items-start gap-4">
            <div className={\`p-2.5 rounded-xl \${f.color}\`}>
              <f.Icon className="w-5 h-5" />
            </div>
            <div className="flex-1">
              <h3 className="font-semibold text-slate-900 mb-1">{f.title}</h3>
              <p className="text-sm text-slate-500 leading-relaxed">{f.desc}</p>
            </div>
            <ChevronDown className={\`w-4 h-4 text-slate-400 mt-0.5 transition-transform duration-200 \${active === i ? 'rotate-180' : ''}\`} />
          </div>
          {active === i && (
            <div className="mt-3 pt-3 border-t border-slate-100 text-xs text-indigo-600 font-medium">
              Learn more →
            </div>
          )}
        </div>
      ))}
    </div>
  );
};

export default Card;`;

      default:
        return `import { useState } from 'react';

const Counter = () => {
  const [count, setCount] = useState(0);

  const isNegative = count < 0;
  const isZero = count === 0;

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-8 w-full max-w-xs">
      <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-widest text-center mb-6">Counter</h2>

      <div className={\`text-6xl font-bold text-center mb-8 tabular-nums transition-colors duration-200 \${isNegative ? 'text-red-500' : isZero ? 'text-slate-300' : 'text-indigo-600'}\`}>
        {count > 0 ? '+' : ''}{count}
      </div>

      <div className="flex gap-3">
        <button onClick={() => setCount(c => c - 1)}
          className="flex-1 py-2.5 rounded-xl border border-slate-200 text-slate-600 font-medium text-sm hover:bg-slate-50 hover:border-slate-300 active:scale-95 transition-all duration-150">
          −
        </button>
        <button onClick={() => setCount(0)} disabled={isZero}
          className="px-4 py-2.5 rounded-xl border border-slate-200 text-slate-400 text-sm hover:bg-slate-50 active:scale-95 transition-all duration-150 disabled:opacity-30 disabled:cursor-not-allowed">
          Reset
        </button>
        <button onClick={() => setCount(c => c + 1)}
          className="flex-1 py-2.5 rounded-xl bg-indigo-600 text-white font-medium text-sm hover:bg-indigo-700 active:scale-95 transition-all duration-150 shadow-sm">
          +
        </button>
      </div>
    </div>
  );
};

export default Counter;`;
    }
  }

  private getOldStringForReplace(componentType: string): string {
    switch (componentType) {
      case "form":
        return "    console.log('Form submitted:', formData);";
      case "card":
        return '      <div className="p-6">';
      default:
        return "  const increment = () => setCount(count + 1);";
    }
  }

  private getNewStringForReplace(componentType: string): string {
    switch (componentType) {
      case "form":
        return "    console.log('Form submitted:', formData);\n    alert('Thank you! We\\'ll get back to you soon.');";
      case "card":
        return '      <div className="p-6 hover:bg-gray-50 transition-colors">';
      default:
        return "  const increment = () => setCount(prev => prev + 1);";
    }
  }

  private getAppCode(componentName: string): string {
    if (componentName === "Card") {
      return `import Card from '@/components/Card';

export default function App() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white flex items-center justify-center p-8">
      <div className="w-full max-w-lg">
        <Card />
      </div>
    </div>
  );
}`;
    }

    if (componentName === "ContactForm") {
      return `import ContactForm from '@/components/ContactForm';

export default function App() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white flex items-center justify-center p-8">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-sm border border-slate-100 p-8">
        <ContactForm />
      </div>
    </div>
  );
}`;
    }

    return `import ${componentName} from '@/components/${componentName}';

export default function App() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white flex items-center justify-center p-8">
      <${componentName} />
    </div>
  );
}`;
  }

  async doGenerate(
    options: Parameters<LanguageModelV1["doGenerate"]>[0]
  ): Promise<Awaited<ReturnType<LanguageModelV1["doGenerate"]>>> {
    const userPrompt = this.extractUserPrompt(options.prompt);

    // Collect all stream parts
    const parts: LanguageModelV1StreamPart[] = [];
    for await (const part of this.generateMockStream(
      options.prompt,
      userPrompt
    )) {
      parts.push(part);
    }

    // Build response from parts
    const textParts = parts
      .filter((p) => p.type === "text-delta")
      .map((p) => (p as any).textDelta)
      .join("");

    const toolCalls = parts
      .filter((p) => p.type === "tool-call")
      .map((p) => ({
        toolCallType: "function" as const,
        toolCallId: (p as any).toolCallId,
        toolName: (p as any).toolName,
        args: (p as any).args,
      }));

    // Get finish reason from finish part
    const finishPart = parts.find((p) => p.type === "finish") as any;
    const finishReason = finishPart?.finishReason || "stop";

    return {
      text: textParts,
      toolCalls,
      finishReason: finishReason as any,
      usage: {
        promptTokens: 100,
        completionTokens: 200,
      },
      warnings: [],
      rawCall: {
        rawPrompt: options.prompt,
        rawSettings: {
          maxTokens: options.maxTokens,
          temperature: options.temperature,
        },
      },
    };
  }

  async doStream(
    options: Parameters<LanguageModelV1["doStream"]>[0]
  ): Promise<Awaited<ReturnType<LanguageModelV1["doStream"]>>> {
    const userPrompt = this.extractUserPrompt(options.prompt);
    const self = this;

    const stream = new ReadableStream<LanguageModelV1StreamPart>({
      async start(controller) {
        try {
          const generator = self.generateMockStream(options.prompt, userPrompt);
          for await (const chunk of generator) {
            controller.enqueue(chunk);
          }
          controller.close();
        } catch (error) {
          controller.error(error);
        }
      },
    });

    return {
      stream,
      warnings: [],
      rawCall: {
        rawPrompt: options.prompt,
        rawSettings: {},
      },
      rawResponse: { headers: {} },
    };
  }
}

export function getLanguageModel() {
  const apiKey = process.env.ANTHROPIC_API_KEY?.trim();

  if (!apiKey || apiKey === "your-api-key-here") {
    console.log(
      "ANTHROPIC_API_KEY is not set (or is still the placeholder). " +
        "Using the mock provider — responses will be canned. " +
        "Set a real key in .env to generate components with Claude."
    );
    return new MockLanguageModel("mock-" + MODEL);
  }

  return anthropic(MODEL);
}
