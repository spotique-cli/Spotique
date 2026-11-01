import React from "react";

export default function Tooltip({ children, ...args }: Partial<Spotique.ReactComponent.TooltipProps>) {
  if (Spotique.ReactComponent.TooltipWrapper) {
    return <Spotique.ReactComponent.TooltipWrapper {...args}>{children}</Spotique.ReactComponent.TooltipWrapper>;
  }

  return children;
}
