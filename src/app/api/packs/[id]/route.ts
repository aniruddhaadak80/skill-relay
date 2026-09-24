import { NextResponse } from "next/server";
import { deletePack, getPack, updatePack } from "@/lib/store";
import { parsePackInput, readJson } from "@/lib/validation";

export const dynamic = "force-dynamic";

type Context = { params: Promise<{ id: string }> };

export async function GET(_request: Request, context: Context) {
  try {
    const { id } = await context.params;
    const item = await getPack(id);
    return item ? NextResponse.json({ item }) : NextResponse.json({ error: "Pack not found" }, { status: 404 });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Unable to read pack" }, { status: 500 });
  }
}

export async function PATCH(request: Request, context: Context) {
  try {
    const { id } = await context.params;
    const input = parsePackInput(readJson(await request.json()), true);
    const item = await updatePack(id, input);
    return item ? NextResponse.json({ item }) : NextResponse.json({ error: "Pack not found" }, { status: 404 });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Unable to update pack" }, { status: 400 });
  }
}

export async function DELETE(_request: Request, context: Context) {
  try {
    const { id } = await context.params;
    const deleted = await deletePack(id);
    return deleted ? NextResponse.json({ deleted: true, id }) : NextResponse.json({ error: "Pack not found" }, { status: 404 });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Unable to delete pack" }, { status: 500 });
  }
}
