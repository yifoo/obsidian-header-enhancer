export function getHeaderLevel(
	text: string,
	startHeaderLevel: number
): [number, number] {
	const match = text.match(/^#+/);
	if (!match) return [0, 0];
	let level = match ? match[0].length : 0;
	return [level - startHeaderLevel + 1, level];
}

export function getNextNumber(
	cntNums: number[],
	headerLevel: number
): number[] {
	let nextNums = [...cntNums];
	if (nextNums.length >= headerLevel) {
		nextNums = nextNums.slice(0, headerLevel);
		nextNums[nextNums.length - 1]++;
	} else {
		while (nextNums.length < headerLevel) {
			nextNums.push(1);
		}
	}
	return nextNums;
}

function hasChineseText(text: string): boolean {
	return /[\u4e00-\u9fff]/.test(text);
}

function toChineseNumber(num: number): string {
	const digits = ["零", "一", "二", "三", "四", "五", "六", "七", "八", "九"];
	if (num <= 0) return num.toString();
	if (num < 10) return digits[num];
	if (num === 10) return "十";
	if (num < 20) return "十" + digits[num % 10];
	if (num < 100) {
		const tens = Math.floor(num / 10);
		const ones = num % 10;
		return digits[tens] + "十" + (ones ? digits[ones] : "");
	}
	if (num < 1000) {
		const hundreds = Math.floor(num / 100);
		const rest = num % 100;
		return digits[hundreds] + "百" + (rest ? toChineseNumber(rest) : "");
	}
	return num.toString();
}

export function formatHeaderNumber(
	cntNums: number[],
	separator: string,
	headerText: string
): string {
	if (cntNums.length === 1 && hasChineseText(headerText)) {
		return toChineseNumber(cntNums[0]) + "、";
	}

	if (hasChineseText(headerText)) {
		return cntNums.slice(1).join(separator);
	}

	return cntNums.join(separator);
}

export function isNeedInsertNumber(text: string, splitor: string): boolean {
	// '## header' true
	// '## 1.1 splitor header' false
	// Extract the part after the # symbols
	const match = text.match(/^(#{1,6})\s+(.*)/);
	if (!match) return false;

	const contentAfterHash = match[2];

	if (stripLeadingHeaderNumber(contentAfterHash) !== contentAfterHash) {
		return false;
	}

	if (splitor == " ") {
		// Check if content starts with a number pattern (e.g., "1.1 text" or "1 text")
		// Should return false if numbering exists, true if it doesn't
		return !/^\d+(?:\.\d+)*\s+/.test(contentAfterHash);
	} else {
		// For other splitors, check if the splitor exists in the content
		return !contentAfterHash.contains(splitor);
	}
}

export function isNeedUpdateNumber(
	nextNumsStr: string,
	text: string,
	splitor: string
): boolean {
	// Extract the part after the # symbols
	const match = text.match(/^(#{1,6})\s+(.*)/);
	if (!match) return false;

	const contentAfterHash = match[2];
	let cntNumsStr: string;

	if (splitor == " ") {
		// Extract the number pattern at the start (e.g., "1.1" from "1.1 header text")
		const numMatch = contentAfterHash.match(/^(\d+(?:\.\d+)*)\s+/);
		if (!numMatch) return true; // No number found, needs update
		cntNumsStr = numMatch[1];
	} else {
		// For other splitors, extract number before the splitor
		const parts = contentAfterHash.split(splitor);
		if (parts.length < 2) return true; // No splitor found, needs update
		cntNumsStr = parts[0].trim();
	}
	return nextNumsStr !== cntNumsStr;
}

function stripLeadingHeaderNumber(headerText: string): string {
	// Support generated and manually typed numbering such as:
	// "1 Title", "1. Title", "1.1 Title", "1-1 Title", "1/1 Title", "1,1 Title".
	// Avoid treating year-like headings such as "2024 Roadmap" as numbered headings.
	return headerText
		.replace(/^[一二三四五六七八九十百千]+[、.．]\s*/, "")
		.replace(/^\d{1,3}(?:[\.\-\/,，]\d{1,3})*(?:[\.\-\/,，、\)]\s*|\s+)/, "");
}

export function getHeadingTextWithoutNumber(text: string): string | null {
	const match = text.match(/^(#{1,6})\s+(.*)/);
	if (!match) return null;

	return stripLeadingHeaderNumber(match[2]).trim();
}

export function replaceHeaderNumber(
	text: string,
	nextNumsStr: string,
	splitor: string
): string {
	const match = text.match(/^(#{1,6})\s+(.*)/);
	if (!match) return text;

	const sharp = match[1];
	const header = stripLeadingHeaderNumber(match[2]).trim();
	if (nextNumsStr.endsWith("、")) {
		return sharp + " " + nextNumsStr + header;
	}
	return sharp + " " + nextNumsStr + splitor + header;
}

export function removeHeaderNumber(text: string, splitor: string): string {
	// remove '1.1 splitor' from '## 1.1 splitor text'
	// Extract the # symbols and content
	const match = text.match(/^(#{1,6})\s+(.*)/);
	if (!match) return text;

	const sharp = match[1];
	const contentAfterHash = match[2];

	if (splitor == " ") {
		// Remove number pattern at the start (e.g., "1.1 " from "1.1 header text")
		const header = stripLeadingHeaderNumber(contentAfterHash);
		return sharp + " " + header;
	} else {
		const headerWithoutNumber = stripLeadingHeaderNumber(contentAfterHash);
		if (headerWithoutNumber !== contentAfterHash) {
			return sharp + " " + headerWithoutNumber;
		}

		// For other splitors, remove everything before and including the first splitor
		if (!contentAfterHash.contains(splitor)) return text;
		const parts = contentAfterHash.split(splitor);
		const header = parts.slice(1).join(splitor).trim();
		return sharp + " " + header;
	}
}

export function isHeader(text: string): boolean {
	return /^#{1,6} .*/.test(text.trim());
}

export interface HeaderLevelAnalysis {
	minLevel: number;      // 文档中最高层级（数字最小的#，如H2=2）
	maxLevel: number;      // 文档中最低层级（数字最大的#，如H5=5）
	usedLevels: number[];  // 文档中实际使用的所有层级，如[2,3,5]
	isEmpty: boolean;      // 文档是否无标题
	headerCount: number;   // 标题总数
}

export function analyzeHeaderLevels(content: string): HeaderLevelAnalysis {
	const lines = content.split('\n');
	const usedLevels: Set<number> = new Set();
	let isCodeBlock = false;
	let headerCount = 0;
	
	for (const line of lines) {
		// 处理代码块（复用现有逻辑）
		if (line.startsWith("```")) {
			isCodeBlock = !isCodeBlock;
			if (line.slice(3).includes("```")) {
				isCodeBlock = !isCodeBlock;
			}
		}
		
		if (isCodeBlock) continue;
		
		if (isHeader(line)) {
			const match = line.match(/^#+/);
			if (match) {
				const level = match[0].length;
				usedLevels.add(level);
				headerCount++;
			}
		}
	}
	
	if (usedLevels.size === 0) {
		return { 
			minLevel: 0, 
			maxLevel: 0, 
			usedLevels: [], 
			isEmpty: true, 
			headerCount: 0 
		};
	}
	
	const levels = Array.from(usedLevels).sort((a, b) => a - b);
	
	// 特殊情况处理：只有一个层级的情况，允许扩展到更深层级
	if (levels.length === 1) {
		const singleLevel = levels[0];
		return {
			minLevel: singleLevel,
			maxLevel: Math.min(singleLevel + 2, 6), // 默认扩展2级，但不超过H6
			usedLevels: levels,
			isEmpty: false,
			headerCount
		};
	}
	
	return {
		minLevel: levels[0],
		maxLevel: levels[levels.length - 1],
		usedLevels: levels,
		isEmpty: false,
		headerCount
	};
}
