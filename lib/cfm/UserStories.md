# User Stories for OIH Conflict Management

## Konflikte auf Mengenebene

User Story:
Als User möchte ich die gleichen Adressen in System A und System B haben.
Konflikt:
Daten sind bis zum initialen Abgleich unterschiedlich.
Lösung:
Initialen Abgleich bis zum gleichen Bestand in beiden Systemen gewährleisten.

User Story:
Als User möchte ich die gleichen Adressen in System A und System B haben.
Konflikt:
Nach Abgleich wurden in beiden Systemen die Daten verändert.
Lösung:
Initialen Abgleich bis zum gleichen Bestand in beiden Systemen gewährleisten.

User Story
Als User möchte ich aus System A und System B in ein drittes System C Adressen übertragen.
Konflikt:
Daten sind in A und B unterschiedlich.
Lösung:
Initialen Abgleich bis zum gleichen Bestand in beiden Systemen gewährleisten.


## Konflikte auf Objektebene

User Story:
Als User möchte ich eine Adresse von System A zu System B übertragen.
Konflikt:
Adresse ist bereits in System B in identischer Form vorhanden. (Dublette)
Lösung:
Dublettenbereinigung: Verwerfen

User Story:
Als User möchte ich eine Adresse von System A zu System B übertragen.
Konflikt:
Adresse ist bereits in System B in ähnlicher Form vorhanden. (möglicherweise Dublette)
Lösung:
Dublettenbereinigung: Überschreiben, verwerfen oder anlegen

User Story:
Als User möchte ich Adressen aus System A in System B löschen.
Konflikt:
Adressen dürfen in B nicht gelöscht werden.
Lösung: Nicht löschen
User Story:
Als User möchte ich geänderte Adressdaten von System A in System B übertragen.
Konflikt:
Adresse wurde vorher in System B gelöscht. (Zero B)
Lösung: Verwerfen oder anlegen

## Konflikte auf Feldebene

User Story:
Als User möchte ich eine Adresse von System A zu System B übertragen.
Konflikt:
Adresse ist bereits in System B vorhanden, aber in Adresse aus System A gibt es neue Daten auf Feldebene, die nicht in B vorhanden sind. (Delta A)
Lösung: Daten einfügen

User Story:
Als User möchte ich eine Adresse von System A zu System B übertragen.
Konflikt:
Adresse ist bereits in System B vorhanden, aber in Adresse aus System A gibt es einen Unterschied auf Feldebene.
Lösung: Verwerfen oder überschreiben

User Story:
Als User möchte ich eine Adresse von System A zu System B übertragen.
Konflikt:
Einzelne Werte sind in beiden Systemen unterschiedlich formatiert, aber inhaltlich gleich (unterschiedliche Repräsentierung).
Lösung: Änderung verwerfen

User Story:
Als User möchte Adressen von System A in System B übertragen.
Konflikt:
Ein Feld in Adresse aus System A existiert nicht in Adresse in System B.
Lösung: Transformer überarbeiten

User Story:
Als User möchte Adressen von System A in System B übertragen.
Konflikt:
Ein Feld in Adresse aus System A wurde vorher in Adresse in System B gelöscht.
Lösung: Wenn Wissen über Löschung vorhanden, dann neuen Eintrag verwerfen.

User Story:
Als User möchte ich Adressen aus System A in System B übertragen.
Konflikt:
Die Typen der Attribute sind unterschiedlich.
Lösung: Transformer überarbeiten

User Story:
Als User möchte ich Adressen aus System A in System B übertragen.
Konflikt:
Einzelne Werte von Feldern werden in System B als Pflichtfeld erwartet, aber System A liefert diese nicht mit.
Lösung: Transformer überarbeiten

User Story:
Als User möchte ich Felder von Adressen aus System A in System B löschen.
Konflikt:
Zu löschende Felder sind Pflichtfelder in System B.
Lösung: Verwerfen
