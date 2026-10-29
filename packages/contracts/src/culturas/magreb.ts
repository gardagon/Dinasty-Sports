import { lista, type Cultura } from './tipos';

/** Magreb (Marruecos, Argelia, Túnez): un solo apellido. */
export const MAGREB: Cultura = {
  id: 'magreb',
  peso: 1,
  nombres: {
    f: {
      jovenes: lista('Fatima, Amina, Khadija, Salma, Yasmin, Sara, Meryem, Imane, Nadia, Aya, Ikram, Hajar, Nour, Rania, Lina, Maryam, Inés, Zineb, Wafae, Hiba, Soumaya, Kenza, Aicha, Chaima, Jihane, Yasmine, Lamiae, Sirine, Assia, Rim'),
      adultos: lista('Fatima, Khadija, Latifa, Malika, Karima, Naima, Samira, Leila, Hind, Houda, Najat, Hanane, Sanaa, Widad, Zineb, Amina, Nadia, Aicha, Rachida, Souad, Loubna, Fatiha, Zohra, Hafida, Nawal, Salima, Bouchra, Meriem, Rajae, Saida'),
    },
    m: {
      jovenes: lista('Mohamed, Adam, Yassin, Ayoub, Omar, Amine, Anas, Ismail, Ilyas, Hamza, Zakaria, Yusef, Ali, Mehdi, Bilal, Reda, Idriss, Rayan, Souhail, Ahmed, Younes, Karim, Nabil, Aymen, Hicham, Walid, Imran, Marwan, Sami, Ziad'),
      adultos: lista('Mohamed, Ahmed, Abdelkader, Said, Rachid, Khalid, Hassan, Youssef, Karim, Mustapha, Abdelaziz, Driss, Brahim, Hicham, Samir, Nabil, Jamal, Mourad, Hussein, Omar, Abdelaziz, Tarik, Ali, Fouad, Abderrahim, Larbi, Mimoun, Kamal, Noureddine, Redouane, Lahcen, Abdelhak, Mohammed'),
    },
  },
  apodos: { Mohamed: ['Momo', 'Moha'], Mohammed: ['Momo', 'Moha'], Ahmed: ['Ahmi'], Abdelaziz: ['Aziz'], Abdelkader: ['Kader'], Youssef: ['Yus', 'Yusuf'], Mustapha: ['Mus'], Hamza: ['Hamzi'], Abderrahim: ['Rahim'], Noureddine: ['Nour'], Fatima: ['Fati'], Khadija: ['Khadi'], Meryem: ['Meri'], Yasmine: ['Yasi'], Soukaina: ['Souki'], Hanane: ['Hani'], Fatiha: ['Fati'], Rachida: ['Racha'] },
  apellidos: lista('El Idrissi, Benali, Amrani, Alaoui, Bouzid, Haddad, Tahiri, Mansouri, Chakir, Bennani, El Fassi, Berrada, Lahlou, Saidi, Belkacem, Mokhtari, Hamdaoui, Benmoussa, Boukhari, Ouali, Cherkaoui, Naciri, Rahmani, Sebti, El Amrani, El Khatib, Slimani, Ziani, Kadiri, Lamrani, Tazi, Bouazza, Fakir, El Ouafi, Bakkali, Aboulkacem, Ait Taleb, Zaidi, Messaoudi, Bensalah, Larbi, Moussaoui, Benkirane, Choukri, El Yousfi, Ouarzazi, Maghraoui, Bouhlal, Fennich, Oulad, Zerouali, Akhannouch, Hajji, Karimi, Laaroussi, Sbai, Talbi'),
  numeroDeApellidos: 1,
};
