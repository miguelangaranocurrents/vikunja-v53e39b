import type {Node as ProseMirrorNode, Slice} from '@tiptap/pm/model'

/**
 * Serializes a copied slice to plain text for the `text/plain` clipboard format.
 *
 * Without this, list structure is lost on copy: every list item becomes a bare line,
 * so the pasted-out text no longer says which lines were bullets or numbers. List items
 * get their markers back, nested lists are indented under their parent item.
 */
export function serializeSliceAsText(slice: Slice): string {
	const lines: string[] = []
	slice.content.forEach(node => lines.push(...blockLines(node, '')))
	return lines.join('\n')
}

function blockLines(node: ProseMirrorNode, indent: string): string[] {
	switch (node.type.name) {
		case 'bulletList':
			return listLines(node, indent, () => '- ')
		case 'orderedList': {
			const start = Number(node.attrs.start ?? 1)
			return listLines(node, indent, index => `${start + index}. `)
		}
		case 'taskList':
			return listLines(node, indent, (_, child) => child.attrs.checked ? '- [x] ' : '- [ ] ')
		case 'listItem':
		case 'taskItem':
			return itemLines(node, indent, '- ')
		case 'blockquote':
			return childLines(node, '').map(line => `${indent}> ${line}`)
	}

	if (node.isTextblock) {
		return [indent + node.textContent]
	}

	if (node.isLeaf) {
		return []
	}

	return childLines(node, indent)
}

function childLines(node: ProseMirrorNode, indent: string): string[] {
	const lines: string[] = []
	node.forEach(child => lines.push(...blockLines(child, indent)))
	return lines
}

function listLines(
	list: ProseMirrorNode,
	indent: string,
	markerFor: (index: number, item: ProseMirrorNode) => string,
): string[] {
	const lines: string[] = []
	let index = 0
	list.forEach(item => {
		lines.push(...itemLines(item, indent, markerFor(index, item)))
		index++
	})
	return lines
}

// The first line of an item carries its marker, following lines are indented to line
// up with the text after the marker.
function itemLines(item: ProseMirrorNode, indent: string, marker: string): string[] {
	const content = childLines(item, '')
	if (content.length === 0) {
		return [indent + marker.trimEnd()]
	}

	const continuation = indent + ' '.repeat(marker.length)
	return content.map((line, i) => i === 0 ? indent + marker + line : (line === '' ? '' : continuation + line))
}
