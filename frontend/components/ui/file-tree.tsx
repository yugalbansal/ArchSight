"use client"

import { useState } from "react"
import { cn } from "@/lib/utils"

interface FileNode {
  name: string
  type: "file" | "folder"
  children?: FileNode[]
  extension?: string
}

interface FileTreeProps {
  data: FileNode[]
  className?: string
}

interface FileItemProps {
  node: FileNode
  depth: number
  isLast: boolean
  parentPath: boolean[]
}

const getFileIcon = (extension?: string) => {
  const iconMap: Record<string, { color: string; icon: string }> = {
    tsx: { color: "text-[#569cd6]", icon: "⚛" },
    ts: { color: "text-[#4ec9b0]", icon: "◆" },
    jsx: { color: "text-[#61dafb]", icon: "⚛" },
    js: { color: "text-[#dcdcaa]", icon: "◆" },
    css: { color: "text-[#c586c0]", icon: "◈" },
    json: { color: "text-[#ce9178]", icon: "{}" },
    md:  { color: "text-[#6a9955]", icon: "◊" },
    svg: { color: "text-[#4ec9b0]", icon: "◐" },
    png: { color: "text-[#4ec9b0]", icon: "◑" },
    py:  { color: "text-[#4ec9b0]", icon: "◆" },
    go:  { color: "text-[#61dafb]", icon: "◆" },
    rs:  { color: "text-[#ff6b6b]", icon: "◆" },
    default: { color: "text-[#808080]", icon: "◇" },
  }
  return iconMap[extension || "default"] || iconMap.default
}

function FileItem({ node, depth, isLast, parentPath }: FileItemProps) {
  const [isOpen, setIsOpen] = useState(depth < 2) // auto-open first 2 levels
  const [isHovered, setIsHovered] = useState(false)

  const isFolder = node.type === "folder"
  const hasChildren = isFolder && node.children && node.children.length > 0
  const fileIcon = getFileIcon(node.extension)

  return (
    <div className="select-none">
      <div
        className={cn(
          "group relative flex items-center gap-1.5 py-[3px] rounded-md cursor-pointer",
          "transition-all duration-150 ease-out",
          isHovered ? "bg-white/5" : "bg-transparent",
        )}
        onClick={() => isFolder && setIsOpen(!isOpen)}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        style={{ paddingLeft: `${depth * 14 + 8}px` }}
      >
        {/* Tree connector line */}
        {depth > 0 && (
          <div
            className="absolute top-0 bottom-0"
            style={{ left: `${(depth - 1) * 14 + 16}px` }}
          >
            <div className={cn(
              "w-px h-full transition-colors duration-150",
              isHovered ? "bg-white/20" : "bg-white/8"
            )} />
          </div>
        )}

        {/* Chevron / dot */}
        <div className={cn(
          "flex items-center justify-center w-3.5 h-3.5 transition-transform duration-200 ease-out shrink-0",
          isFolder && isOpen && "rotate-90",
        )}>
          {isFolder ? (
            <svg width="6" height="8" viewBox="0 0 6 8" fill="none"
              className={cn("transition-colors duration-150", isHovered ? "text-white" : "text-[#5A5A7A]")}>
              <path d="M1 1L5 4L1 7" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          ) : (
            <span className={cn("text-[10px] transition-opacity duration-150", fileIcon.color, isHovered ? "opacity-100" : "opacity-60")}>
              {fileIcon.icon}
            </span>
          )}
        </div>

        {/* Folder / file icon */}
        <div className={cn(
          "flex items-center justify-center w-4 h-4 shrink-0 transition-all duration-150",
          isFolder
            ? isHovered ? "text-[#dcb67a]" : "text-[#dcb67a]/70"
            : isHovered ? cn(fileIcon.color, "scale-110") : cn(fileIcon.color, "opacity-60"),
        )}>
          {isFolder ? (
            <svg width="14" height="12" viewBox="0 0 16 14" fill="currentColor">
              <path d="M1.5 1C0.671573 1 0 1.67157 0 2.5V11.5C0 12.3284 0.671573 13 1.5 13H14.5C15.3284 13 16 12.3284 16 11.5V4.5C16 3.67157 15.3284 3 14.5 3H8L6.5 1H1.5Z" />
            </svg>
          ) : (
            <svg width="12" height="14" viewBox="0 0 14 16" fill="currentColor" opacity="0.75">
              <path d="M1.5 0C0.671573 0 0 0.671573 0 1.5V14.5C0 15.3284 0.671573 16 1.5 16H12.5C13.3284 16 14 15.3284 14 14.5V4.5L9.5 0H1.5Z" />
              <path d="M9 0V4.5H14" fill="white" fillOpacity="0.3" />
            </svg>
          )}
        </div>

        {/* Label */}
        <span className={cn(
          "font-mono text-[13px] transition-colors duration-150 truncate",
          isFolder
            ? isHovered ? "text-white" : "text-[#A0A0C0]"
            : isHovered ? "text-white" : "text-[#7A7A9A]",
        )}>
          {node.name}
        </span>

        {/* Hover dot */}
        <div className={cn(
          "absolute right-2 w-1 h-1 rounded-full bg-white/30 transition-all duration-150",
          isHovered ? "opacity-100 scale-100" : "opacity-0 scale-0",
        )} />
      </div>

      {/* Children */}
      {hasChildren && (
        <div
          className={cn(
            "overflow-hidden transition-all duration-200 ease-out",
            isOpen ? "opacity-100" : "opacity-0 h-0",
          )}
          style={{ maxHeight: isOpen ? `${node.children!.length * 200}px` : "0px" }}
        >
          {node.children!.map((child, index) => (
            <FileItem
              key={`${child.name}-${index}`}
              node={child}
              depth={depth + 1}
              isLast={index === node.children!.length - 1}
              parentPath={[...parentPath, !isLast]}
            />
          ))}
        </div>
      )}
    </div>
  )
}

export function FileTree({ data, className }: FileTreeProps) {
  return (
    <div className={cn(
      "bg-[#0D0D15] rounded-xl border border-[#1E1E2E] p-3 font-mono overflow-hidden",
      className,
    )}>
      {/* VS Code-style window bar */}
      <div className="flex items-center gap-2 pb-3 mb-2 border-b border-[#1E1E2E]">
        <div className="flex gap-1.5">
          <div className="w-2.5 h-2.5 rounded-full bg-[#FF5F57]" />
          <div className="w-2.5 h-2.5 rounded-full bg-[#FEBC2E]" />
          <div className="w-2.5 h-2.5 rounded-full bg-[#28C840]" />
        </div>
        <span className="text-[10px] text-[#5A5A7A] ml-2 uppercase tracking-widest font-mono">explorer</span>
      </div>

      {/* Tree content */}
      <div className="space-y-0">
        {data.map((node, index) => (
          <FileItem
            key={node.name}
            node={node}
            depth={0}
            isLast={index === data.length - 1}
            parentPath={[]}
          />
        ))}
      </div>
    </div>
  )
}
