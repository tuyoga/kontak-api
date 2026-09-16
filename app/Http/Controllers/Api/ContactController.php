<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Contact;
use Illuminate\Http\Request;

class ContactController extends Controller
{
    /**
     * GET /api/kontak
     * Tampilkan semua kontak beserta nomor teleponnya.
     */
    public function index()
    {
        return response()->json(Contact::with('phones')->get());
    }

    /**
     * POST /api/kontak
     * Tambah kontak baru, opsional langsung sertakan array phones.
     */
    public function store(Request $request)
    {
        $request->validate([
            'nama' => 'required|string',
            'alamat' => 'required|string',
            'tanggal_lahir' => 'required|date',
            'phones' => 'array',
            'phones.*.jenis' => 'required_with:phones|in:Rumah,HP,Kantor',
            'phones.*.nomor_telepon' => 'required_with:phones|string',
        ]);

        $contact = Contact::create($request->only('nama', 'alamat', 'tanggal_lahir'));

        if ($request->has('phones')) {
            $contact->phones()->createMany($request->phones);
        }

        return response()->json($contact->load('phones'), 201);
    }

    /**
     * GET /api/kontak/{id}
     * Tampilkan detail 1 kontak beserta nomor teleponnya.
     */
    public function show($id)
    {
        return response()->json(Contact::with('phones')->findOrFail($id));
    }

    /**
     * PUT/PATCH /api/kontak/{id}
     * Perbarui data kontak (tidak termasuk phones, dikelola terpisah).
     */
    public function update(Request $request, $id)
    {
        $contact = Contact::findOrFail($id);

        $validated = $request->validate([
            'nama' => 'sometimes|required|string',
            'alamat' => 'sometimes|required|string',
            'tanggal_lahir' => 'sometimes|required|date',
        ]);

        $contact->update($validated);

        return response()->json($contact->load('phones'));
    }

    /**
     * DELETE /api/kontak/{id}
     * Hapus kontak. kontak_phones ikut terhapus otomatis (onDelete cascade).
     */
    public function destroy($id)
    {
        Contact::destroy($id);

        return response()->json([
            'message' => 'Kontak Terhapus',
        ]);
    }
}