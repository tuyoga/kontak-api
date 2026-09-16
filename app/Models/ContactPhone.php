<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class ContactPhone extends Model
{
    /**
     * Nama tabel di database.
     */
    protected $table = 'kontak_phones';

    /**
     * Kolom yang boleh diisi lewat mass assignment.
     */
    protected $fillable = [
        'kontak_id',
        'jenis',
        'nomor_telepon',
    ];

    /**
     * Relasi Inverse: 1 Nomor Telepon milik 1 Kontak.
     */
    public function contact()
    {
        return $this->belongsTo(Contact::class, 'kontak_id');
    }
}