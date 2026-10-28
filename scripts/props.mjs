// Reads an item's props from its source with the TypeScript parser: the exported component's first parameter,
// resolved to an interface or type alias in the same file. Defaults come from the destructuring pattern, descriptions from JSDoc.
import ts from "typescript";

const clean = (text) => text.replace(/\s+/g, " ").trim();

function docOf(node, sf) {
  const jsdoc = ts.getJSDocCommentsAndTags(node).find((d) => ts.isJSDoc(d));
  if (jsdoc?.comment) return clean(typeof jsdoc.comment === "string" ? jsdoc.comment : jsdoc.comment.map((c) => c.text).join(""));
  const ranges = ts.getLeadingCommentRanges(sf.text, node.pos) ?? [];
  const line = ranges.map((r) => sf.text.slice(r.pos, r.end)).find((c) => c.startsWith("//"));
  return line ? clean(line.replace(/^\/\/\s?/, "")) : "";
}

/** @returns {{ props: { name: string, type: string, required: boolean, default?: string, description?: string }[], extends: string[] } | null} */
export function propsOf(source, componentName) {
  if (!componentName) return null;
  const sf = ts.createSourceFile("item.tsx", source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  const declarations = new Map();
  let component = null;

  ts.forEachChild(sf, (node) => {
    if ((ts.isInterfaceDeclaration(node) || ts.isTypeAliasDeclaration(node)) && node.name) declarations.set(node.name.text, node);
    if (ts.isFunctionDeclaration(node) && node.name?.text === componentName) component = node;
    if (ts.isVariableStatement(node)) {
      for (const d of node.declarationList.declarations) {
        if (ts.isIdentifier(d.name) && d.name.text === componentName && d.initializer && (ts.isArrowFunction(d.initializer) || ts.isFunctionExpression(d.initializer))) component = d.initializer;
      }
    }
  });
  if (!component) return null;
  const param = component.parameters[0];
  if (!param) return { props: [], extends: [] };

  const defaults = new Map();
  if (ts.isObjectBindingPattern(param.name)) {
    for (const el of param.name.elements) {
      const key = el.propertyName && ts.isIdentifier(el.propertyName) ? el.propertyName.text : ts.isIdentifier(el.name) ? el.name.text : null;
      if (key && el.initializer) defaults.set(key, clean(el.initializer.getText(sf)));
    }
  }

  const props = new Map();
  const bases = [];
  const seen = new Set();

  const addMembers = (members) => {
    for (const m of members) {
      if (!ts.isPropertySignature(m) && !ts.isMethodSignature(m)) continue;
      const name = m.name.getText(sf).replace(/^["']|["']$/g, "");
      if (props.has(name)) continue;
      const type = ts.isMethodSignature(m)
        ? clean(`(${m.parameters.map((p) => p.getText(sf)).join(", ")}) => ${m.type ? m.type.getText(sf) : "void"}`)
        : m.type
          ? clean(m.type.getText(sf))
          : "unknown";
      const description = docOf(m, sf);
      props.set(name, { name, type, required: !m.questionToken, ...(defaults.has(name) ? { default: defaults.get(name) } : {}), ...(description ? { description } : {}) });
    }
  };

  const visitLocal = (name) => {
    const local = declarations.get(name);
    if (seen.has(name)) return;
    seen.add(name);
    if (ts.isInterfaceDeclaration(local)) {
      addMembers(local.members);
      for (const clause of local.heritageClauses ?? []) {
        for (const t of clause.types) {
          const base = t.expression.getText(sf);
          if (declarations.has(base) && !t.typeArguments) visitLocal(base);
          else bases.push(clean(t.getText(sf)));
        }
      }
    } else visit(local.type);
  };

  const visit = (typeNode) => {
    if (!typeNode) return;
    if (ts.isParenthesizedTypeNode(typeNode)) return visit(typeNode.type);
    if (ts.isTypeLiteralNode(typeNode)) return addMembers(typeNode.members);
    if (ts.isIntersectionTypeNode(typeNode)) return typeNode.types.forEach(visit);
    if (ts.isTypeReferenceNode(typeNode)) {
      const name = typeNode.typeName.getText(sf);
      if (declarations.has(name)) return visitLocal(name);
    }
    bases.push(clean(typeNode.getText(sf)));
  };

  visit(param.type);
  for (const [name, value] of defaults) if (props.has(name)) props.get(name).default = value;
  return { props: [...props.values()], extends: bases };
}
