const DEFAULT_BOT_TOKEN = 'None';
const DEFAULT_CHAT_ID = 'None';

export async function sendTelegramMessageDetailed(
  message: string,
  targetChatId?: string
): Promise<{ success: boolean; error?: string }> {
  const token = process.env.TELEGRAM_BOT_TOKEN || DEFAULT_BOT_TOKEN;
  const chatId = targetChatId || process.env.TELEGRAM_CHAT_ID || DEFAULT_CHAT_ID;

  if (!token || token === 'None') {
    return {
      success: false,
      error: 'TELEGRAM_BOT_TOKEN belum dikonfigurasi di environment server.',
    };
  }

  if (!chatId || chatId === 'None') {
    return {
      success: false,
      error: 'Chat ID Telegram belum diatur. Masukkan Chat ID numerik Anda terlebih dahulu.',
    };
  }

  try {
    const url = `https://api.telegram.org/bot${token}/sendMessage`;
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        chat_id: chatId,
        text: message,
      }),
    });

    const data = (await response.json()) as any;

    if (!response.ok || !data.ok) {
      const desc = data.description || 'Gagal mengirim pesan ke Telegram.';
      let friendlyError = desc;

      if (desc.includes('chat not found')) {
        friendlyError = `Chat ID (${chatId}) tidak ditemukan oleh Bot Telegram. Pastikan Anda sudah membuka chat dengan bot dan menekan tombol /start atau mengirim pesan /start ke bot tersebut.`;
      } else if (desc.includes('bot was blocked')) {
        friendlyError = `Bot Telegram diblokir oleh akun Anda. Buka bot di Telegram lalu klik Unblock / Restart bot.`;
      } else if (desc.includes('Unauthorized') || desc.includes('token is invalid')) {
        friendlyError = `Token bot Telegram tidak valid. Periksa kembali TELEGRAM_BOT_TOKEN.`;
      }

      console.error('Telegram error:', desc);
      return { success: false, error: friendlyError };
    }

    console.log(`Telegram notification sent to chat_id: ${chatId}`);
    return { success: true };
  } catch (error: any) {
    console.error('Telegram error:', error?.message || error);
    return { success: false, error: error?.message || 'Terjadi kesalahan jaringan saat menghubungi API Telegram.' };
  }
}

export async function sendTelegramMessage(message: string, targetChatId?: string): Promise<boolean> {
  const result = await sendTelegramMessageDetailed(message, targetChatId);
  return result.success;
}

function formatRupiah(num: number): string {
  return 'Rp ' + Math.abs(num).toLocaleString('id-ID');
}

export async function sendTransactionNotification(
  tx: {
    type: string;
    category: string;
    amount: number;
    date: string;
    note?: string;
    currentBalance: number;
  },
  targetChatId?: string
): Promise<boolean> {
  const jenis = tx.type === 'income' ? 'Income' : 'Expense';
  const nominal = formatRupiah(tx.amount);
  const saldo = formatRupiah(tx.currentBalance);
  const catatan = tx.note && tx.note.trim() ? tx.note : '-';

  const message = `💰 Transaksi Baru

Jenis:
${jenis}

Kategori:
${tx.category}

Nominal:
${nominal}

Tanggal:
${tx.date}

Catatan:
${catatan}

Saldo Setelah Transaksi:
${saldo}`;

  return await sendTelegramMessage(message, targetChatId);
}

export async function sendTelegramDocument(
  fileBuffer: Buffer,
  filename: string,
  caption: string,
  targetChatId?: string
): Promise<boolean> {
  const token = process.env.TELEGRAM_BOT_TOKEN || DEFAULT_BOT_TOKEN;
  const chatId = targetChatId || process.env.TELEGRAM_CHAT_ID || DEFAULT_CHAT_ID;

  if (!token || !chatId || token === 'None' || chatId === 'None') {
    console.warn('Telegram info: TELEGRAM_BOT_TOKEN or target Chat ID is not configured');
    return false;
  }

  try {
    const url = `https://api.telegram.org/bot${token}/sendDocument`;
    const formData = new FormData();
    formData.append('chat_id', chatId);
    formData.append('caption', caption);

    const blob = new Blob([fileBuffer], { type: 'application/pdf' });
    formData.append('document', blob, filename);

    const response = await fetch(url, {
      method: 'POST',
      body: formData,
    });

    const data = await response.json();

    if (!response.ok || !data.ok) {
      console.error('Telegram error:', data.description || 'Failed to send document');
      return false;
    }

    console.log(`Telegram PDF report document sent to chat_id: ${chatId}`);
    return true;
  } catch (error: any) {
    console.error('Telegram error:', error?.message || error);
    return false;
  }
}


