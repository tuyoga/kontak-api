<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Contact extends Model
{
    /**
     * Nama tabel di database (default Eloquent menebak "contacts",
     * jadi harus dioverride karena tabel kita bernama "kontak").
     */
    protected $table = 'kontak';

    /**
     * Kolom yang boleh diisi lewat mass assignment (create/update).
     */
    protected $fillable = [
        'nama',
        'alamat',
        'tanggal_lahir',
    ];

    /**
     * Relasi: 1 Kontak punya banyak Nomor Telepon.
     */
    public function phones()
    {
        return $this->hasMany(ContactPhone::class, 'kontak_id');
    }
}