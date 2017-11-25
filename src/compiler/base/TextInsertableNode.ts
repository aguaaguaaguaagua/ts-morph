﻿import * as ts from "typescript";
import CodeBlockWriter from "code-block-writer";
import * as errors from "./../../errors";
import {Constructor} from "./../../Constructor";
import {insertIntoParent} from "./../../manipulation";
import {TypeGuards, getTextFromStringOrWriter} from "./../../utils";
import {Node} from "./../common";

export type TextInsertableNodeExtensionType = Node;

export interface TextInsertableNode {
    /**
     * Inserts text within the body of the node.
     *
     * WARNING: This will forget any previously navigated descendant nodes.
     * @param pos - Position to insert at.
     * @param text - Text to insert.
     */
    insertText(pos: number, text: string): this;
    /**
     * Inserts text within the body of the node using a writer.
     *
     * WARNING: This will forget any previously navigated descendant nodes.
     * @param pos - Position to insert at.
     * @param writerFunction - Write the text using the provided writer.
     */
    insertText(pos: number, writerFunction: (writer: CodeBlockWriter) => void): this;
    /**
     * Replaces text within the body of the node.
     *
     * WARNING: This will forget any previously navigated descendant nodes.
     * @param range - Start and end position of the text to replace.
     * @param text - Text to replace the range with.
     */
    replaceText(range: [number, number], text: string): this;
    /**
     * Replaces text within the body of the node using a writer function.
     *
     * WARNING: This will forget any previously navigated descendant nodes.
     * @param range - Start and end position of the text to replace.
     * @param writerFunction - Write the text using the provided writer.
     */
    replaceText(range: [number, number], writerFunction: (writer: CodeBlockWriter) => void): this;
    /**
     * Removes text within the body of the node.
     *
     * WARNING: This will forget any previously navigated descendant nodes.
     * @param pos - Start position to remove.
     * @param end - End position to remove.
     */
    removeText(pos: number, end: number): this;
}

export function TextInsertableNode<T extends Constructor<TextInsertableNodeExtensionType>>(Base: T): Constructor<TextInsertableNode> & T {
    return class extends Base implements TextInsertableNode {
        insertText(pos: number, writerFunction: (writer: CodeBlockWriter) => void): this;
        insertText(pos: number, text: string): this;
        insertText(pos: number, textOrWriterFunction: string | ((writer: CodeBlockWriter) => void)) {
            this.replaceText([pos, pos], textOrWriterFunction);
            return this;
        }

        removeText(pos: number, end: number) {
            this.replaceText([pos, end], "");
            return this;
        }

        replaceText(range: [number, number], text: string): this;
        replaceText(range: [number, number], writerFunction: (writer: CodeBlockWriter) => void): this;
        replaceText(range: [number, number], textOrWriterFunction: string | ((writer: CodeBlockWriter) => void)): this;
        replaceText(range: [number, number], textOrWriterFunction: string | ((writer: CodeBlockWriter) => void)) {
            const thisNode = this;
            const childSyntaxList = this.getChildSyntaxListOrThrow();
            const pos = range[0];
            const end = range[1];

            verifyArguments();

            // ideally this wouldn't replace the existing syntax list
            insertIntoParent({
                insertPos: pos,
                childIndex: childSyntaxList.getChildIndex(),
                insertItemsCount: 1,
                newText: getTextFromStringOrWriter(this.global.manipulationSettings, textOrWriterFunction),
                parent: this,
                replacing: {
                    textLength: end - pos,
                    nodes: [childSyntaxList]
                }
            });

            return this;

            function verifyArguments() {
                verifyInRange(pos);
                verifyInRange(end);

                if (pos > end)
                    throw new errors.ArgumentError(nameof(range), "Cannot specify a start position greater than the end position.");
            }

            function verifyInRange(i: number) {
                const nodeToVerifyRange = getNodeToVerifyRange();
                if (i >= nodeToVerifyRange.getPos() && i <= nodeToVerifyRange.getEnd())
                    return;

                throw new errors.InvalidOperationError(`Cannot insert or replace text outside the bounds of the node. ` +
                    `Expected a position between [${nodeToVerifyRange.getPos()}, ${nodeToVerifyRange.getEnd()}], but received ${i}.`);
            }

            function getNodeToVerifyRange() {
                if (TypeGuards.isSourceFile(thisNode))
                    return thisNode;
                return childSyntaxList;
            }
        }
    };
}
