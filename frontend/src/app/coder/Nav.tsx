import React from 'react'
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

const Nav = () => {
  return (
    <nav className="flex items-center justify-between px-6 py-2 bg-background fixed h-12">
      <div className="flex items-center gap-2">
        <Badge>HireHacker</Badge>
      </div>
      <div className="flex items-center gap-4">
        <Button variant="ghost">Problems</Button>
        <Button variant="ghost">Submissions</Button>
      </div>
    </nav>
  );
}

export default Nav