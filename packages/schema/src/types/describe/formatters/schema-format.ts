import { JSON as JSONValue } from "ts-std";
import { LabelledType } from "../../fundamental/value";
import { Buffer } from "../buffer";
import formatter, { Formatter } from "../formatter";
import { PrimitiveLabel, typeNameOf } from "../label";
import { Position, ReporterDelegate } from "../reporter";

const delegate: ReporterDelegate<Buffer, string, void> = {
  openRecord({ type }) {
    let name = type.label.name;
    return `Record(${JSON.stringify(name)}, {\n`;
  },
  closeRecord({ buffer, type, nesting }) {
    buffer.push("})");

    const metadata = type.label.type.metadata;

    if (metadata) {
      buffer.push(".metadata({\n");

      let keys = Object.keys(metadata);
      let last = keys.length - 1;

      keys.forEach((key, i) => {
        buffer.push(
          `${pad(nesting * 2)}${key}: ${JSON.stringify(metadata[key])}`
        );

        if (i !== last) {
          buffer.push(",");
        }

        buffer.push("\n");
      });

      buffer.push("})");
    }
  },

  openDictionary(): string {
    return `Dictionary({\n`;
  },
  emitKey({ key, nesting }): string {
    return `${pad(nesting * 2)}${key}: `;
  },
  closeDictionary({ buffer, nesting, position, required }): string | void {
    buffer.push(`${pad(nesting * 2)}})`);

    if (
      required &&
      position !== Position.ListItem &&
      position !== Position.PointerItem
    ) {
      buffer.push(".required()");
    }
  },

  openGeneric({ buffer, type: { label } }): void {
    switch (label.type.kind) {
      case "iterator":
        buffer.push("hasMany(");
        break;
      case "list":
        buffer.push("List(");
        break;
      case "pointer":
        buffer.push("hasOne(");
        break;
      default:
        throw new Error("unreachable");
    }
  },
  closeGeneric({ buffer, position, type }): void {
    buffer.push(")");

    if (
      type.isRequired &&
      position !== Position.ListItem &&
      position !== Position.PointerItem
    ) {
      buffer.push(".required()");
    }
  },

  emitNamedType({ type: { label }, buffer }): void {
    buffer.push(`${label.name}`);
  },

  closeValue({ position }): string | void {
    if (position === Position.First || position === Position.Middle) {
      return ",\n";
    } else if (position === Position.Last) {
      return "\n";
    }
  },

  emitPrimitive({ type, position, buffer }): void {
    buffer.push(formatType(type));

    if (
      type.isRequired &&
      position !== Position.ListItem &&
      position !== Position.IteratorItem
    ) {
      buffer.push(`.required()`);
    }
  }
};

function formatType(type: LabelledType<PrimitiveLabel>) {
  let { name, args } = type.label;
  let out = `${typeNameOf(name)}(${formatArgs(args)})`;

  return out;
}

function formatArgs(args: JSONValue | undefined): string {
  if (Array.isArray(args)) {
    return JSON.stringify(args).slice(1, -1);
  } else if (args === undefined) {
    return "";
  } else {
    return JSON.stringify(args);
  }
}

function pad(size: number): string {
  return " ".repeat(size);
}

export const schemaFormat: Formatter<void> = formatter(delegate, Buffer);
