import { DemoShell } from "@/components/demo-shell"
import { DemoProvider } from "@/lib/store"

export default function Page() {
  return (
    <DemoProvider>
      <DemoShell />
    </DemoProvider>
  )
}
