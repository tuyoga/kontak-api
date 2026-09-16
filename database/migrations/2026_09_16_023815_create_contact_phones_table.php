<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Menjalankan migration.
     */
    public function up(): void
    {
        Schema::create('kontak_phones', function (Blueprint $table) {
            $table->id();
            $table->foreignId('kontak_id')
                ->constrained('kontak')
                ->onDelete('cascade');
            $table->enum('jenis', ['Rumah', 'HP', 'Kantor'])->default('HP');
            $table->string('nomor_telepon');
            $table->timestamps();
        });
    }

    /**
     * Membatalkan migration (rollback).
     */
    public function down(): void
    {
        Schema::dropIfExists('kontak_phones');
    }
};